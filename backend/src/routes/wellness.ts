/**
 * Wellness Score API Routes
 * Provides wellness score calculation and factors analysis
 */

import { Router, Response } from 'express';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import { analyzeWellness, recordDailyScore } from '../pattern';
import { checkPermission } from '../permissions';
import { sendSuccess, sendError, sendUnauthorized, sendForbidden } from '../utils/response';
import * as betterSqlite3 from 'better-sqlite3';

const router = Router();

export default (db: betterSqlite3.Database) => {
  /**
   * Get wellness score for a user
   * GET /api/wellness/:userId
   * 
   * Returns daily wellness score based on:
   * - Check-in consistency
   * - Medication adherence
   * - Activity patterns
   * - Social connections
   */
  router.get('/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return sendUnauthorized(res, 'Authentication required');
      }

      // Verify user is requesting their own data or has permission
      if (req.user.id !== req.params.userId) {
        // Check family connection permission
        const connection = db.prepare(`
          SELECT * FROM family_connections 
          WHERE senior_id = ? AND family_member_id = ?
        `).get(req.params.userId, req.user.id);
        
        if (!connection) {
          return sendForbidden(res, 'Access denied');
        }
      }

      // Calculate and record daily score
      const score = recordDailyScore(db, req.params.userId);
      const factors = analyzeWellness(db, req.params.userId);

      sendSuccess(res, {
        score,
        factors,
        date: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Wellness fetch error', error);
      sendError(res, 'Failed to fetch wellness score', 'WELLNESS_FETCH_ERROR');
    }
  });

  /**
   * Get wellness history for a user
   * GET /api/wellness/:userId/history?days=7
   */
  router.get('/:userId/history', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: { message: 'Authentication required', code: 'AUTH_REQUIRED' } 
        });
      }

      const days = parseInt(req.query.days as string) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get historical scores from activity logs
      const history = db.prepare(`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as activity_count,
          SUM(CASE WHEN type = 'check_in' THEN 1 ELSE 0 END) as check_ins
        FROM activity_logs
        WHERE user_id = ? AND timestamp >= ?
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `).all(req.params.userId, startDate.toISOString()) as any[];

      res.json({
        success: true,
        data: {
          history: history.map((row: any) => ({
            date: row.date,
            activityCount: row.activity_count,
            checkIns: row.check_ins,
            // Calculate approximate score based on activity
            score: Math.min(100, Math.round((row.check_ins * 30 + row.activity_count * 10)))
          }))
        }
      });
    } catch (error: any) {
      logger.error('Wellness history error', error);
      res.status(500).json({ 
        success: false, 
        error: { message: 'Failed to fetch wellness history', code: 'WELLNESS_HISTORY_ERROR' } 
      });
    }
  });

  return router;
};
