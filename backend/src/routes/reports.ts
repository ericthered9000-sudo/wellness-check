/**
 * Weekly Reports API Routes
 */

import express from 'express';
import { getWeeklyReport, getWeeklyReports, generateWeeklyReport } from '../reports';

const router = express.Router();

// ==================== Weekly Reports ====================

/**
 * Get a weekly report for a senior
 * GET /api/reports/weekly/:userId
 */
router.get('/weekly/:userId', (req, res) => {
  const { userId } = req.params;
  const weekStart = req.query.weekStart as string;
  
  try {
    let report;
    if (weekStart) {
      report = getWeeklyReport(userId, weekStart);
    } else {
      // Get the most recent report for this week
      const reportList = getWeeklyReports(userId, 1);
      if (reportList.length > 0) {
        report = reportList[0];
      } else {
        // Generate a new report if none exists
        report = generateWeeklyReport(userId);
      }
    }
    
    res.json(report);
  } catch (error: any) {
    console.error('Failed to get weekly report:', error);
    res.status(500).json({ error: 'Failed to get weekly report' });
  }
});

/**
 * Get all weekly reports for a senior (default: last 8 weeks)
 * GET /api/reports/weekly/:userId/all
 */
router.get('/weekly/:userId/all', (req, res) => {
  const { userId } = req.params;
  const weeks = parseInt(req.query.weeks as string) || 8;
  
  try {
    const reports = getWeeklyReports(userId, weeks);
    res.json(reports);
  } catch (error: any) {
    console.error('Failed to get weekly reports:', error);
    res.status(500).json({ error: 'Failed to get weekly reports' });
  }
});

/**
 * Generate/refresh a weekly report
 * POST /api/reports/weekly/:userId/generate
 */
router.post('/weekly/:userId/generate', (req, res) => {
  const { userId } = req.params;
  const weekStart = req.body.weekStart as string;
  
  try {
    const report = generateWeeklyReport(userId, weekStart);
    res.status(201).json(report);
  } catch (error: any) {
    console.error('Failed to generate weekly report:', error);
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
});

export default router;
