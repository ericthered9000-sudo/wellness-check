/**
 * Medication API Routes
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import {
  createMedication,
  getMedication,
  getMedications,
  updateMedication,
  deleteMedication,
  logMedicationTaken,
  logMedicationSkipped,
  getMedicationLogs,
  calculateAdherence,
  getMedicationsDueToday,
  getOverdueMedications
} from '../medications';
import { notesSchema, reasonSchema, instructionsSchema } from '../utils/sanitize';

import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types/auth';

const router = express.Router();

// DB injected from index.ts so access checks share the app's database instance
let routeDb: any;

export function setMedicationsRouteDb(database: any) {
  routeDb = database;
}

const canAccessSenior = (callerId: string | undefined, seniorId: string | undefined): boolean => {
  if (!callerId || !seniorId) return false;
  if (callerId === seniorId) return true;
  if (!routeDb) return false;
  return !!routeDb.prepare(
    'SELECT 1 FROM family_connections WHERE senior_id = ? AND family_member_id = ?'
  ).get(seniorId, callerId);
};

// For routes carrying :userId — caller must be the senior or a connected family member
const withSeniorAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!canAccessSenior(req.user?.id, req.params.userId)) {
    return res.status(403).json({ error: 'Access denied: No connection to this senior' });
  }
  return next();
};

// For routes carrying :id (medication-scoped) — check the medication's owner
const withMedicationAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const med = getMedication(req.params.id);
    if (!med) return res.status(404).json({ error: 'Medication not found' });
    if (!canAccessSenior(req.user?.id, med.user_id)) {
      return res.status(403).json({ error: 'Access denied: No connection to this senior' });
    }
    return next();
  } catch (error) {
    logger.error('Medication access check failed:', error);
    return res.status(500).json({ error: 'Access check failed' });
  }
};

// Auth required for every medication route; ownership checks per route below
router.use(authMiddleware);

/**
 * Create a new medication
 * POST /api/medications
 */
router.post('/', (req: AuthRequest, res) => {
  const { userId, name, dosage, unit, instructions, schedule, times } = req.body;
  
  if (!userId || !name || !schedule || !times) {
    return res.status(400).json({ 
      error: 'Missing required fields: userId, name, schedule, times' 
    });
  }

  // Access: creating for yourself or for a connected senior
  if (!canAccessSenior(req.user?.id, userId)) {
    return res.status(403).json({ error: 'Access denied: No connection to this senior' });
  }

  if (!Array.isArray(times) || times.length === 0) {
    return res.status(400).json({ 
      error: 'Times must be a non-empty array of times (e.g., ["08:00", "20:00"])' 
    });
  }
  
  // Validate instructions if provided
  const instructionsResult = instructionsSchema.safeParse(instructions);
  if (instructions !== undefined && !instructionsResult.success) {
    return res.status(400).json({ 
      error: 'Invalid instructions format',
      details: instructionsResult.error.issues 
    });
  }
  
  try {
    const medication = createMedication({ 
      userId, 
      name, 
      dosage, 
      unit, 
      instructions: instructionsResult?.data, 
      schedule, 
      times 
    });
    res.status(201).json(medication);
  } catch (error: any) {
    logger.error('Failed to create medication', error);
    res.status(500).json({ error: 'Failed to create medication' });
  }
});

/**
 * Get all medications for a user
 * GET /api/medications/:userId
 */
router.get('/:userId', withSeniorAccess, (req, res) => {
  const { userId } = req.params;
  
  try {
    const medications = getMedications(userId);
    res.json(medications);
  } catch (error: any) {
    logger.error('Failed to get medications:', error);
    res.status(500).json({ error: 'Failed to get medications' });
  }
});

/**
 * Get a single medication
 * GET /api/medications/detail/:id
 */
router.get('/detail/:id', withMedicationAccess, (req, res) => {
  const { id } = req.params;
  
  try {
    const medication = getMedication(id);
    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    res.json(medication);
  } catch (error: any) {
    logger.error('Failed to get medication:', error);
    res.status(500).json({ error: 'Failed to get medication' });
  }
});

/**
 * Update a medication
 * PUT /api/medications/:id
 */
router.put('/:id', withMedicationAccess, (req, res) => {
  const { id } = req.params;
  const { name, dosage, unit, instructions, schedule, times } = req.body;
  
  try {
    const medication = updateMedication(id, { 
      name, 
      dosage, 
      unit, 
      instructions, 
      schedule, 
      times 
    });
    
    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    
    res.json(medication);
  } catch (error: any) {
    logger.error('Failed to update medication:', error);
    res.status(500).json({ error: 'Failed to update medication' });
  }
});

/**
 * Delete (deactivate) a medication
 * DELETE /api/medications/:id
 */
router.delete('/:id', withMedicationAccess, (req, res) => {
  const { id } = req.params;
  
  try {
    const success = deleteMedication(id);
    if (!success) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    res.json({ success: true, message: 'Medication deleted' });
  } catch (error: any) {
    logger.error('Failed to delete medication:', error);
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

// ==================== Medication Logs ====================

/**
 * Log medication as taken
 * POST /api/medications/:id/taken
 */
router.post('/:id/taken', withMedicationAccess, (req, res) => {
  const { id } = req.params;
  const { userId, notes } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  
  // Validate and sanitize notes
  const notesResult = notesSchema.safeParse(notes);
  if (!notesResult.success) {
    return res.status(400).json({ 
      error: 'Invalid notes format',
      details: notesResult.error.issues 
    });
  }
  
  try {
    const log = logMedicationTaken(id, userId, notesResult.data);
    res.status(201).json(log);
  } catch (error: any) {
    logger.error('Failed to log medication taken:', error);
    res.status(500).json({ error: 'Failed to log medication' });
  }
});

/**
 * Log medication as skipped
 * POST /api/medications/:id/skipped
 */
router.post('/:id/skipped', withMedicationAccess, (req, res) => {
  const { id } = req.params;
  const { userId, reason } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  
  // Validate and sanitize reason
  const reasonResult = reasonSchema.safeParse(reason);
  if (!reasonResult.success) {
    return res.status(400).json({ 
      error: 'Invalid reason format',
      details: reasonResult.error.issues 
    });
  }
  
  try {
    const log = logMedicationSkipped(id, userId, reasonResult.data);
    res.status(201).json(log);
  } catch (error: any) {
    logger.error('Failed to log medication skipped:', error);
    res.status(500).json({ error: 'Failed to log medication' });
  }
});

/**
 * Get medication logs for a user
 * GET /api/medications/logs/:userId
 */
router.get('/logs/:userId', withSeniorAccess, (req, res) => {
  const { userId } = req.params;
  const days = parseInt(req.query.days as string) || 7;
  
  try {
    const logs = getMedicationLogs(userId, days);
    res.json(logs);
  } catch (error: any) {
    logger.error('Failed to get medication logs:', error);
    res.status(500).json({ error: 'Failed to get medication logs' });
  }
});

// ==================== Adherence ====================

/**
 * Get medication adherence stats
 * GET /api/medications/adherence/:userId
 */
router.get('/adherence/:userId', withSeniorAccess, (req, res) => {
  const { userId } = req.params;
  const days = parseInt(req.query.days as string) || 7;
  
  try {
    const adherence = calculateAdherence(userId, days);
    res.json(adherence);
  } catch (error: any) {
    logger.error('Failed to calculate adherence:', error);
    res.status(500).json({ error: 'Failed to calculate adherence' });
  }
});

/**
 * Get medications due today
 * GET /api/medications/due/:userId
 */
router.get('/due/:userId', withSeniorAccess, (req, res) => {
  const { userId } = req.params;
  
  try {
    const due = getMedicationsDueToday(userId);
    res.json(due);
  } catch (error: any) {
    logger.error('Failed to get due medications:', error);
    res.status(500).json({ error: 'Failed to get due medications' });
  }
});

/**
 * Get overdue medications
 * GET /api/medications/overdue/:userId
 */
router.get('/overdue/:userId', withSeniorAccess, (req, res) => {
  const { userId } = req.params;
  
  try {
    const overdue = getOverdueMedications(userId);
    res.json(overdue);
  } catch (error: any) {
    logger.error('Failed to get overdue medications:', error);
    res.status(500).json({ error: 'Failed to get overdue medications' });
  }
});

export default router;