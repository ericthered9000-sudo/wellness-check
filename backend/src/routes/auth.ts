import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { generateToken, authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { AuthRequest } from '../types/auth';
import * as betterSqlite3 from 'better-sqlite3';

const router = Router();

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

      // If senior, create senior profile
      if (role === 'senior') {
        db.prepare(`
          INSERT INTO senior_profiles (user_id)
          VALUES (?)
        `).run(userId);
      }

      // Generate token and set as httpOnly cookie
      const token = generateToken({ id: userId, email, role });

      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });

      // SECURITY: Don't return token in response body - it's in the httpOnly cookie
      // Note: Mobile apps (Expo) use Authorization header instead of cookies, 
      // so we still return the token for mobile compatibility
      res.status(201).json({
        success: true,
        user: { id: userId, email, role },
        token: token // Required for mobile apps using AsyncStorage
      });
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

      // SECURITY: Token returned for mobile apps (Expo uses AsyncStorage)
      // Web clients should use the httpOnly cookie instead
      res.json({
        success: true,
        user: { id: user.id, email: user.email, role: user.role },
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
