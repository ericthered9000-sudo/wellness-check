/**
 * Medication API Routes
 */

import express from 'express';
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

const router = express.Router();

// ==================== Medications ====================

/**
 * Create a new medication
 * POST /api/medications
 */
router.post('/', (req, res) => {
  const { userId, name, dosage, unit, instructions, schedule, times } = req.body;
  
  if (!userId || !name || !schedule || !times) {
    return res.status(400).json({ 
      error: 'Missing required fields: userId, name, schedule, times' 
    });
  }
  
  if (!Array.isArray(times) || times.length === 0) {
    return res.status(400).json({ 
      error: 'Times must be a non-empty array of times (e.g., ["08:00", "20:00"])' 
    });
  }
  
  try {
    const medication = createMedication({ 
      userId, 
      name, 
      dosage, 
      unit, 
      instructions, 
      schedule, 
      times 
    });
    res.status(201).json(medication);
  } catch (error: any) {
    console.error('Failed to create medication:', error);
    res.status(500).json({ error: 'Failed to create medication' });
  }
});

/**
 * Get all medications for a user
 * GET /api/medications/:userId
 */
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  
  try {
    const medications = getMedications(userId);
    res.json(medications);
  } catch (error: any) {
    console.error('Failed to get medications:', error);
    res.status(500).json({ error: 'Failed to get medications' });
  }
});

/**
 * Get a single medication
 * GET /api/medications/detail/:id
 */
router.get('/detail/:id', (req, res) => {
  const { id } = req.params;
  
  try {
    const medication = getMedication(id);
    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    res.json(medication);
  } catch (error: any) {
    console.error('Failed to get medication:', error);
    res.status(500).json({ error: 'Failed to get medication' });
  }
});

/**
 * Update a medication
 * PUT /api/medications/:id
 */
router.put('/:id', (req, res) => {
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
    console.error('Failed to update medication:', error);
    res.status(500).json({ error: 'Failed to update medication' });
  }
});

/**
 * Delete (deactivate) a medication
 * DELETE /api/medications/:id
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  try {
    const success = deleteMedication(id);
    if (!success) {
      return res.status(404).json({ error: 'Medication not found' });
    }
    res.json({ success: true, message: 'Medication deleted' });
  } catch (error: any) {
    console.error('Failed to delete medication:', error);
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

// ==================== Medication Logs ====================

/**
 * Log medication as taken
 * POST /api/medications/:id/taken
 */
router.post('/:id/taken', (req, res) => {
  const { id } = req.params;
  const { userId, notes } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  
  try {
    const log = logMedicationTaken(id, userId, notes);
    res.status(201).json(log);
  } catch (error: any) {
    console.error('Failed to log medication taken:', error);
    res.status(500).json({ error: 'Failed to log medication' });
  }
});

/**
 * Log medication as skipped
 * POST /api/medications/:id/skipped
 */
router.post('/:id/skipped', (req, res) => {
  const { id } = req.params;
  const { userId, reason } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  
  try {
    const log = logMedicationSkipped(id, userId, reason);
    res.status(201).json(log);
  } catch (error: any) {
    console.error('Failed to log medication skipped:', error);
    res.status(500).json({ error: 'Failed to log medication' });
  }
});

/**
 * Get medication logs for a user
 * GET /api/medications/logs/:userId
 */
router.get('/logs/:userId', (req, res) => {
  const { userId } = req.params;
  const days = parseInt(req.query.days as string) || 7;
  
  try {
    const logs = getMedicationLogs(userId, days);
    res.json(logs);
  } catch (error: any) {
    console.error('Failed to get medication logs:', error);
    res.status(500).json({ error: 'Failed to get medication logs' });
  }
});

// ==================== Adherence ====================

/**
 * Get medication adherence stats
 * GET /api/medications/adherence/:userId
 */
router.get('/adherence/:userId', (req, res) => {
  const { userId } = req.params;
  const days = parseInt(req.query.days as string) || 7;
  
  try {
    const adherence = calculateAdherence(userId, days);
    res.json(adherence);
  } catch (error: any) {
    console.error('Failed to calculate adherence:', error);
    res.status(500).json({ error: 'Failed to calculate adherence' });
  }
});

/**
 * Get medications due today
 * GET /api/medications/due/:userId
 */
router.get('/due/:userId', (req, res) => {
  const { userId } = req.params;
  
  try {
    const due = getMedicationsDueToday(userId);
    res.json(due);
  } catch (error: any) {
    console.error('Failed to get due medications:', error);
    res.status(500).json({ error: 'Failed to get due medications' });
  }
});

/**
 * Get overdue medications
 * GET /api/medications/overdue/:userId
 */
router.get('/overdue/:userId', (req, res) => {
  const { userId } = req.params;
  
  try {
    const overdue = getOverdueMedications(userId);
    res.json(overdue);
  } catch (error: any) {
    console.error('Failed to get overdue medications:', error);
    res.status(500).json({ error: 'Failed to get overdue medications' });
  }
});

export default router;