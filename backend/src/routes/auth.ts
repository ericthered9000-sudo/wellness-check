import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { generateToken, authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import * as betterSqlite3 from 'better-sqlite3';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['senior', 'family'])
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export default (db: betterSqlite3.Database) => {
  // Register new user
  router.post('/register', async (req: Request, res: Response) => {
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

      // Check if user already exists
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email already registered'
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

      // Generate token
      const token = generateToken({ id: userId, email, role });

      res.status(201).json({
        success: true,
        user: { id: userId, email, role },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  });

  // Login
  router.post('/login', async (req: Request, res: Response) => {
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
          error: 'Invalid credentials'
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate token
      const token = generateToken({ id: user.id, email: user.email, role: user.role as 'senior' | 'family' });

      res.json({
        success: true,
        user: { id: user.id, email: user.email, role: user.role },
        token
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