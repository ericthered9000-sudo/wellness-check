/**
 * Account Management API Routes
 * Handles account deletion, data export, and account settings
 */

import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import * as betterSqlite3 from 'better-sqlite3';

const router = Router();

export default (db: betterSqlite3.Database) => {
  /**
   * DELETE /api/account - Permanently delete user account and all data
   * GDPR/CCPA compliance - "Right to be forgotten"
   */
  router.delete('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userId = req.user.id;

      // Delete all user data in correct order (foreign key constraints)
      // 1. Delete activity events
      db.prepare('DELETE FROM activity_events WHERE user_id = ?').run(userId);

      // 2. Delete wellness scores
      db.prepare('DELETE FROM wellness_scores WHERE senior_id = ?').run(userId);

      // 3. Delete medications and related data
      const meds = db.prepare('SELECT id FROM medications WHERE user_id = ?').all(userId) as any[];
      for (const med of meds) {
        db.prepare('DELETE FROM medication_logs WHERE medication_id = ?').run(med.id);
        db.prepare('DELETE FROM medication_reminders WHERE medication_id = ?').run(med.id);
      }
      db.prepare('DELETE FROM medications WHERE user_id = ?').run(userId);

      // 4. Delete doctor visits and reminders
      const visits = db.prepare('SELECT id FROM doctor_visits WHERE user_id = ?').all(userId) as any[];
      for (const visit of visits) {
        db.prepare('DELETE FROM visit_reminders WHERE visit_id = ?').run(visit.id);
      }
      db.prepare('DELETE FROM doctor_visits WHERE user_id = ?').run(userId);

      // 5. Delete family connections (as senior AND as family member)
      db.prepare('DELETE FROM family_connections WHERE senior_id = ? OR family_member_id = ?').run(userId, userId);

      // 6. Delete invite codes
      db.prepare('DELETE FROM invite_codes WHERE senior_id = ?').run(userId);

      // 7. Delete push subscriptions
      db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(userId);

      // 8. Delete weekly reports
      db.prepare('DELETE FROM weekly_reports WHERE senior_id = ?').run(userId);

      // 9. Delete senior profile
      db.prepare('DELETE FROM senior_profiles WHERE user_id = ?').run(userId);

      // 10. Finally delete the user
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);

      res.json({
        success: true,
        message: 'Account and all data permanently deleted'
      });
    } catch (error: any) {
      console.error('Account deletion error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete account'
      });
    }
  });

  /**
   * GET /api/account - Get current user account info
   */
  router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
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

      // Get stats
      const activityCount = db.prepare('SELECT COUNT(*) as count FROM activity_events WHERE user_id = ?').get(req.user.id) as { count: number };
      const connectionCount = db.prepare('SELECT COUNT(*) as count FROM family_connections WHERE senior_id = ? OR family_member_id = ?').all(req.user.id, req.user.id).length;

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.created_at
        },
        stats: {
          activityCount: activityCount.count,
          connectionCount
        }
      });
    } catch (error: any) {
      console.error('Get account error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get account info'
      });
    }
  });

  return router;
};
