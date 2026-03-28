/**
 * Activity Routes - Passive tracking data collection
 * 
 * Receives sensor data from mobile app (accelerometer, pedometer)
 * Stores activity events for pattern analysis
 */

import { Router, Response } from 'express';
import { logger } from '../utils/logger.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AuthRequest } from '../types/auth.js';
import * as betterSqlite3 from 'better-sqlite3';

const router = Router();

export default (db: betterSqlite3.Database) => {
  /**
   * POST /api/v1/activity/batch
   * Batch upload activity data from passive tracking
   */
  router.post('/batch', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401);
      }

      const { activities } = req.body;
      
      if (!activities || !Array.isArray(activities)) {
        return sendError(res, 'Invalid activities array', 'VALIDATION_ERROR', 400);
      }

      // Insert activities (batch insert without explicit transaction for simplicity)
      const insertStmt = db.prepare(`
        INSERT INTO activity_events (user_id, type, timestamp, value, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const activity of activities) {
        insertStmt.run(
          userId,
          activity.type,
          activity.timestamp,
          JSON.stringify(activity.value),
          new Date().toISOString()
        );
      }

      logger.info(`User ${userId} uploaded ${activities.length} activity events`);
      return sendSuccess(res, { count: activities.length });
    } catch (err: any) {
      logger.error('Activity batch upload error:', err);
      return sendError(res, 'Failed to upload activities', 'UPLOAD_ERROR', 500);
    }
  });

  /**
   * POST /api/v1/activity
   * Single activity event (manual or automatic)
   */
  router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401);
      }

      const { type, value, timestamp } = req.body;
      
      if (!type || !value) {
        return sendError(res, 'Type and value required', 'VALIDATION_ERROR', 400);
      }

      const stmt = db.prepare(`
        INSERT INTO activity_events (user_id, type, timestamp, value, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        userId,
        type,
        timestamp || new Date().toISOString(),
        JSON.stringify(value),
        new Date().toISOString()
      );

      logger.info(`User ${userId} logged activity: ${type}`);
      return sendSuccess(res, { id: (db as any).lastInsertRowid });
    } catch (err: any) {
      logger.error('Activity upload error:', err);
      return sendError(res, 'Failed to upload activity', 'UPLOAD_ERROR', 500);
    }
  });

  /**
   * GET /api/v1/activity/:userId
   * Get activity history for a user
   */
  router.get('/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { limit = '50', offset = '0' } = req.query;
      
      // Check permissions - user can only see their own or connected family
      const requestingUserId = req.user?.id;
      if (!requestingUserId) {
        return sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401);
      }

      // Check if requesting user has access to this senior's data
      const connection = db.prepare(`
        SELECT id FROM family_connections
        WHERE senior_id = ? AND family_member_id = ?
      `).get(userId, requestingUserId);

      // Also allow if requesting their own data
      if (!connection && userId !== requestingUserId) {
        return sendError(res, 'Access denied', 'FORBIDDEN', 403);
      }

      const activities = db.prepare(`
        SELECT id, type, timestamp, value, created_at
        FROM activity_events
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `).all(userId, parseInt(limit as string), parseInt(offset as string));

      return sendSuccess(res, activities);
    } catch (err: any) {
      logger.error('Activity fetch error:', err);
      return sendError(res, 'Failed to fetch activities', 'FETCH_ERROR', 500);
    }
  });

  /**
   * GET /api/v1/activity/:userId/summary
   * Get activity summary for wellness score calculation
   */
  router.get('/:userId/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      
      const startOfDay = `${date}T00:00:00Z`;
      const endOfDay = `${date}T23:59:59Z`;

      // Get activity counts for the day
      const summary = db.prepare(`
        SELECT 
          type,
          COUNT(*) as count,
          MIN(timestamp) as first_activity,
          MAX(timestamp) as last_activity
        FROM activity_events
        WHERE user_id = ?
          AND timestamp >= ?
          AND timestamp <= ?
        GROUP BY type
      `).get(userId, startOfDay, endOfDay);

      // Get step count if available
      const steps = db.prepare(`
        SELECT SUM(JSON_EXTRACT(value, '$.stepChange')) as total_steps
        FROM activity_events
        WHERE user_id = ?
          AND type = 'steps'
          AND timestamp >= ?
          AND timestamp <= ?
      `).get(userId, startOfDay, endOfDay);

      // Get last movement time
      const lastMovement = db.prepare(`
        SELECT MAX(timestamp) as last_movement
        FROM activity_events
        WHERE user_id = ?
          AND timestamp >= ?
          AND timestamp <= ?
      `).get(userId, startOfDay, endOfDay);

      return sendSuccess(res, {
        date,
        summary,
        steps: steps?.total_steps || 0,
        lastMovement: lastMovement?.last_movement,
      });
    } catch (err: any) {
      logger.error('Activity summary error:', err);
      return sendError(res, 'Failed to fetch activity summary', 'FETCH_ERROR', 500);
    }
  });

  return router;
};
