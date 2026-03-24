import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { generateToken, authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { AuthRequest } from '../types/auth';
import * as betterSqlite3 from 'better-sqlite3';

const router = Router();

// Generate 8-character alphanumeric code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Strong password validation - 12+ chars with complexity
const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  role: z.enum(['senior', 'family'])
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export default (db: betterSqlite3.Database) => {
  // Register new user - with rate limiting
  router.post('/register', authLimiter, async (req: Request, res: Response) => {
    try {
      const validation = registerSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: validation.error.issues
        });
      }

      const { email, password, role } = validation.data;

      // Check if user already exists - use generic message to avoid enumeration
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
        // SECURITY: Hash password anyway to normalize timing
        await bcrypt.hash(password, 12);
        return res.status(409).json({
          success: false,
          error: 'Registration failed' // Generic to avoid user enumeration
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 12);

      // Create user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      db.prepare(`
        INSERT INTO users (id, email, role, password_hash)
        VALUES (?, ?, ?, ?)
      `).run(userId, email, role, password_hash);

      // Generate token
      const token = generateToken({ id: userId, email, role });

      // If senior, create senior profile AND generate invite code
      if (role === 'senior') {
        db.prepare(`
          INSERT INTO senior_profiles (user_id)
          VALUES (?)
        `).run(userId);
        
        // Generate invite code for senior
        const inviteCode = `HB-${generateInviteCode()}`;
        const inviteId = `invite-${userId}-${inviteCode}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        // Create invite_codes table if not exists
        db.exec(`
          CREATE TABLE IF NOT EXISTS invite_codes (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            senior_id TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (senior_id) REFERENCES users(id)
          )
        `);
        
        db.prepare(`
          INSERT INTO invite_codes (id, code, senior_id, used, expires_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(inviteId, inviteCode, userId, 0, expiresAt.toISOString());
        
        // Set cookie and return user with invite code
        res.cookie('auth_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/'
        });
        
        res.status(201).json({
          success: true,
          user: { id: userId, email, role, inviteCode },
          token: token
        });
      } else {
        // Family member - no invite code needed
        res.cookie('auth_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/'
        });
        
        res.status(201).json({
          success: true,
          user: { id: userId, email, role },
          token: token
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  });

  // Login - with rate limiting
  router.post('/login', authLimiter, async (req: Request, res: Response) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: validation.error.issues
        });
      }

      const { email, password } = validation.data;

      // Find user
      const user = db.prepare(`
        SELECT id, email, role, password_hash
        FROM users
        WHERE email = ?
      `).get(email) as { id: string; email: string; role: string; password_hash: string } | undefined;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials' // Generic - same as wrong password
        });
      }

      // Verify password - use constant-time comparison
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials' // Same message as user not found
        });
      }

      // Generate token and set as httpOnly cookie
      const token = generateToken({ id: user.id, email: user.email, role: user.role as 'senior' | 'family' });

      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });

      // If senior, get their invite code
      let inviteCode = null;
      if (user.role === 'senior') {
        const invite = db.prepare(`
          SELECT code FROM invite_codes 
          WHERE senior_id = ? AND used = 0 
          ORDER BY created_at DESC LIMIT 1
        `).get(user.id) as { code: string } | undefined;
        
        if (invite) {
          inviteCode = invite.code;
        } else {
          // Generate new code if none exists
          inviteCode = `HB-${generateInviteCode()}`;
          const inviteId = `invite-${user.id}-${inviteCode}`;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          
          db.prepare(`
            INSERT INTO invite_codes (id, code, senior_id, used, expires_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(inviteId, inviteCode, user.id, 0, expiresAt.toISOString());
        }
      }

      // SECURITY: Token returned for mobile apps (Expo uses AsyncStorage)
      // Web clients should use the httpOnly cookie instead
      res.json({
        success: true,
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          ...(inviteCode && { inviteCode })
        },
        token: token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  });

  // Get current user (protected route)
  router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const user = db.prepare(`
        SELECT id, email, role, created_at
        FROM users
        WHERE id = ?
      `).get(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({ success: true, user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user'
      });
    }
  });

  // Logout (client-side token removal, but we can track it)
  router.post('/logout', (req: AuthRequest, res: Response) => {
    // In a production app, you might want to blacklist the token
    // For now, we just return success
    res.json({ success: true, message: 'Logged out successfully' });
  });

  return router;
};
