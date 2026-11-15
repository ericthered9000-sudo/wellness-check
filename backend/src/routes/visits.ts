// Doctor Visits API Routes
import { logger } from '../utils/logger';
import { Router, Request, Response } from 'express';
import {
  createVisit,
  getVisits,
  getUpcomingVisits,
  getVisit,
  updateVisit,
  deleteVisit,
  getUserNotifications
} from '../visits';

const router = Router();

// Create a new doctor visit
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, doctorName, dateTime, specialty, location, notes, reminderDaysBefore } = req.body;

    if (!userId || !doctorName || !dateTime) {
      return res.status(400).json({ error: 'userId, doctorName, and dateTime are required' });
    }

    const visit = await createVisit(
      userId,
      doctorName,
      dateTime,
      specialty,
      location,
      notes,
      reminderDaysBefore || 1
    );

    res.status(201).json(visit);
  } catch (error) {
    logger.error('Error creating visit:', error);
    res.status(500).json({ error: 'Failed to create visit' });
  }
});

// Get all visits for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const visits = await getVisits(userId);
    res.json(visits);
  } catch (error) {
    logger.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

// Get upcoming visits for a user (next 30 days)
router.get('/upcoming/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const visits = await getUpcomingVisits(userId);
    res.json(visits);
  } catch (error) {
    logger.error('Error fetching upcoming visits:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming visits' });
  }
});

// Get a single visit
router.get('/:visitId', async (req: Request, res: Response) => {
  try {
    const { visitId } = req.params;
    const visit = await getVisit(visitId);
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    res.json(visit);
  } catch (error) {
    logger.error('Error fetching visit:', error);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
});

// Update a visit
router.put('/:visitId', async (req: Request, res: Response) => {
  try {
    const { visitId } = req.params;
    const updates = req.body;

    // Don't allow updating id or user_id
    delete updates.id;
    delete updates.user_id;
    delete updates.created_at;

    const visit = await updateVisit(visitId, updates);
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    res.json(visit);
  } catch (error) {
    logger.error('Error updating visit:', error);
    res.status(500).json({ error: 'Failed to update visit' });
  }
});

// Delete a visit
router.delete('/:visitId', async (req: Request, res: Response) => {
  try {
    const { visitId } = req.params;
    await deleteVisit(visitId);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting visit:', error);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
});

// Get in-app notifications for a user
router.get('/notifications/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const notifications = await getUserNotifications(userId);
    res.json(notifications);
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

export default router;