/**
 * Alerts Routes - Passive tracking alerts
 * 
 * Receives and processes alerts from passive tracking:
 * - Fall detection
 * - No movement alerts
 * - Unusual pattern alerts
 */

import { Router, Response } from 'express';
import { logger } from '../utils/logger.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AuthRequest } from '../types/auth.js';
import * as betterSqlite3 from 'better-sqlite3';
import { Server } from 'socket.io';

const router = Router();

export default (db: betterSqlite3.Database, io: Server) => {
  /**
   * POST /api/v1/alerts/fall
   * Fall detection alert - high priority, immediate notification
   */
  router.post('/fall', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401);
      }

      const { type, data, timestamp, confidence } = req.body;
      
      if (!type || !data) {
        return sendError(res, 'Type and data required', 'VALIDATION_ERROR', 400);
      }

      // Store fall event
      const stmt = db.prepare(`
        INSERT INTO activity_events (user_id, type, timestamp, value, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        userId,
        'fall',
        timestamp || new Date().toISOString(),
        JSON.stringify({ ...data, confidence }),
        new Date().toISOString()
      );

      // Create alert record
      const alertStmt = db.prepare(`
        INSERT INTO alerts (user_id, type, level, message, data, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const alertId = alertStmt.run(
        userId,
        'fall',
        'critical',
        'Potential fall detected',
        JSON.stringify({ ...data, confidence }),
        new Date().toISOString()
      );

      // Notify family members immediately via WebSocket
      const familyMembers = db.prepare(`
        SELECT family_member_id FROM family_connections
        WHERE senior_id = ?
      `).all(userId) as any[];

      for (const member of familyMembers) {
        io.to(`user:${member.family_member_id}`).emit('alert', {
          id: alertId.lastInsertRowid,
          type: 'fall',
          level: 'critical',
          message: 'Potential fall detected',
          timestamp: timestamp || new Date().toISOString(),
          data,
        });
      }

      logger.warn(`Fall alert for user ${userId}, confidence: ${confidence}`);
      return sendSuccess(res, { alertId: alertId.lastInsertRowid, notified: familyMembers.length });
    } catch (err: any) {
      logger.error('Fall alert error:', err);
      return sendError(res, 'Failed to process fall alert', 'ALERT_ERROR', 500);
    }
  });

  /**
   * POST /api/v1/alerts/no-movement
   * No movement alert - triggered by background task
   */
  router.post('/no-movement', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401);
      }

      const { type, hours, level, timestamp } = req.body;
      
      if (!type || !hours || !level) {
        return sendError(res, 'Type, hours, and level required', 'VALIDATION_ERROR', 400);
      }

      // Check if we already have a recent no-movement alert (avoid duplicates)
      const recentAlert = db.prepare(`
        SELECT id FROM alerts
        WHERE user_id = ?
          AND type = 'no_movement'
          AND created_at > datetime('now', '-1 hour')
      `).get(userId);

      if (recentAlert) {
        logger.info(`Skipping duplicate no-movement alert for user ${userId}`);
        return sendSuccess(res, { skipped: true, reason: 'recent alert exists' });
      }

      // Create alert record
      const alertStmt = db.prepare(`
        INSERT INTO alerts (user_id, type, level, message, data, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const message = level === 'red' 
        ? `No movement detected for ${hours.toFixed(1)} hours`
        : `Unusual inactivity: no movement for ${hours.toFixed(1)} hours (daytime)`;

      const alertId = alertStmt.run(
        userId,
        'no_movement',
        level,
        message,
        JSON.stringify({ hours, level, timestamp }),
        new Date().toISOString()
      );

      // Notify family members via WebSocket
      const familyMembers = db.prepare(`
        SELECT family_member_id FROM family_connections
        WHERE senior_id = ?
      `).all(userId) as any[];

      for (const member of familyMembers) {
        io.to(`user:${member.family_member_id}`).emit('alert', {
          id: alertId.lastInsertRowid,
          type: 'no_movement',
          level: level === 'red' ? 'high' : 'medium',
          message,
          hours,
          timestamp: timestamp || new Date().toISOString(),
        });
      }

      logger.info(`${level} no-movement alert for user ${userId}: ${hours.toFixed(1)} hours`);
      return sendSuccess(res, { alertId: alertId.lastInsertRowid, notified: familyMembers.length });
    } catch (err: any) {
      logger.error('No-movement alert error:', err);
      return sendError(res, 'Failed to process no-movement alert', 'ALERT_ERROR', 500);
    }
  });

  /**
   * GET /api/v1/alerts
   * Get alerts for current user
   */
  router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401);
      }

      const { limit = '50', level } = req.query;
      
      let query = `
        SELECT id, user_id, type, level, message, data, created_at, acknowledged
        FROM alerts
        WHERE user_id = ?
      `;

      const params: any[] = [userId];

      if (level) {
        query += ` AND level = ?`;
        params.push(level);
      }

      query += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(parseInt(limit as string));

      const alerts = db.prepare(query).all(...params);

      return sendSuccess(res, alerts);
    } catch (err: any) {
      logger.error('Alerts fetch error:', err);
      return sendError(res, 'Failed to fetch alerts', 'FETCH_ERROR', 500);
    }
  });

  /**
   * POST /api/v1/alerts/:alertId/acknowledge
   * Acknowledge an alert
   */
  router.post('/:alertId/acknowledge', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { alertId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401);
      }

      const stmt = db.prepare(`
        UPDATE alerts
        SET acknowledged = 1, acknowledged_at = ?
        WHERE id = ? AND user_id = ?
      `);

      const result = stmt.run(new Date().toISOString(), alertId, userId);

      if (result.changes === 0) {
        return sendError(res, 'Alert not found', 'NOT_FOUND', 404);
      }

      logger.info(`User ${userId} acknowledged alert ${alertId}`);
      return sendSuccess(res, { acknowledged: true });
    } catch (err: any) {
      logger.error('Alert acknowledge error:', err);
      return sendError(res, 'Failed to acknowledge alert', 'ACKNOWLEDGE_ERROR', 500);
    }
  });

  return router;
};
