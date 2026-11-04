// FamilyShift Caregiver Coordination API Routes
import { logger } from '../utils/logger';
import { Router, Request, Response } from 'express';
import * as betterSqlite3 from 'better-sqlite3';

interface FamilyShiftRouterOptions {
  db: betterSqlite3.Database;
}

export default function familyshiftRouter({ db }: FamilyShiftRouterOptions): Router {
  const router = Router();

  const generateId = (): string =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // ==================== TASKS ====================

  // Create task
  router.post('/tasks', (req: Request, res: Response) => {
    try {
      const { seniorId, assignedTo, createdBy, title, description, dueDate, priority } = req.body;
      if (!seniorId || !assignedTo || !createdBy || !title) {
        return res.status(400).json({ error: 'seniorId, assignedTo, createdBy, and title are required' });
      }
      const id = generateId();
      db.prepare(`INSERT INTO caregiver_tasks (id, senior_id, assigned_to, created_by, title, description, due_date, priority)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, seniorId, assignedTo, createdBy, title, description || null, dueDate || null, priority || 'normal');
      const task = db.prepare('SELECT * FROM caregiver_tasks WHERE id = ?').get(id);
      res.status(201).json(task);
    } catch (error) {
      logger.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Get tasks for a senior
  router.get('/tasks/:seniorId', (req: Request, res: Response) => {
    try {
      const tasks = db.prepare('SELECT * FROM caregiver_tasks WHERE senior_id = ? ORDER BY created_at DESC').all(req.params.seniorId);
      res.json(tasks);
    } catch (error) {
      logger.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Update task
  router.patch('/tasks/:id', (req: Request, res: Response) => {
    try {
      const { title, description, dueDate, priority, status } = req.body;
      const existing = db.prepare('SELECT * FROM caregiver_tasks WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Task not found' });
      db.prepare(`UPDATE caregiver_tasks SET
        title = COALESCE(?, title), description = COALESCE(?, description),
        due_date = COALESCE(?, due_date), priority = COALESCE(?, priority),
        status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`).run(title || null, description || null, dueDate || null, priority || null, status || null, req.params.id);
      const updated = db.prepare('SELECT * FROM caregiver_tasks WHERE id = ?').get(req.params.id);
      res.json(updated);
    } catch (error) {
      logger.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // Mark task complete
  router.patch('/tasks/:id/complete', (req: Request, res: Response) => {
    try {
      const { completedBy } = req.body;
      db.prepare(`UPDATE caregiver_tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP, completed_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(completedBy || null, req.params.id);
      const task = db.prepare('SELECT * FROM caregiver_tasks WHERE id = ?').get(req.params.id);
      res.json(task);
    } catch (error) {
      logger.error('Error completing task:', error);
      res.status(500).json({ error: 'Failed to complete task' });
    }
  });

  // Delete task
  router.delete('/tasks/:id', (req: Request, res: Response) => {
    try {
      db.prepare('DELETE FROM caregiver_tasks WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting task:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  // Get tasks assigned to a user
  router.get('/tasks/assigned/:userId', (req: Request, res: Response) => {
    try {
      const tasks = db.prepare(`SELECT ct.*, u.email as senior_email FROM caregiver_tasks ct
        JOIN users u ON u.id = ct.senior_id WHERE ct.assigned_to = ? ORDER BY ct.created_at DESC`).all(req.params.userId);
      res.json(tasks);
    } catch (error) {
      logger.error('Error fetching assigned tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // ==================== JOURNAL ====================

  // Create journal entry
  router.post('/journal', (req: Request, res: Response) => {
    try {
      const { seniorId, authorId, category, content, mood, photoUrl, isPrivate } = req.body;
      if (!seniorId || !authorId || !category || !content) {
        return res.status(400).json({ error: 'seniorId, authorId, category, and content are required' });
      }
      const id = generateId();
      db.prepare(`INSERT INTO care_journal (id, senior_id, author_id, category, content, mood, photo_url, is_private)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, seniorId, authorId, category, content, mood || null, photoUrl || null, isPrivate ? 1 : 0);
      const entry = db.prepare('SELECT * FROM care_journal WHERE id = ?').get(id);
      res.status(201).json(entry);
    } catch (error) {
      logger.error('Error creating journal entry:', error);
      res.status(500).json({ error: 'Failed to create journal entry' });
    }
  });

  // Get journal entries for a senior
  router.get('/journal/:seniorId', (req: Request, res: Response) => {
    try {
      const entries = db.prepare(`SELECT cj.*, u.email as author_email FROM care_journal cj
        JOIN users u ON u.id = cj.author_id WHERE cj.senior_id = ? ORDER BY cj.created_at DESC`).all(req.params.seniorId);
      res.json(entries);
    } catch (error) {
      logger.error('Error fetching journal:', error);
      res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
  });

  // Delete journal entry
  router.delete('/journal/:id', (req: Request, res: Response) => {
    try {
      db.prepare('DELETE FROM care_journal WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting journal entry:', error);
      res.status(500).json({ error: 'Failed to delete journal entry' });
    }
  });

  // ==================== EXPENSES ====================

  // Create expense
  router.post('/expenses', (req: Request, res: Response) => {
    try {
      const { seniorId, paidBy, amount, category, description, receiptUrl, isReimbursable } = req.body;
      if (!seniorId || !paidBy || !amount || !category) {
        return res.status(400).json({ error: 'seniorId, paidBy, amount, and category are required' });
      }
      const id = generateId();
      db.prepare(`INSERT INTO care_expenses (id, senior_id, paid_by, amount, category, description, receipt_url, is_reimbursable)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, seniorId, paidBy, amount, category, description || null, receiptUrl || null, isReimbursable ? 1 : 0);
      const expense = db.prepare('SELECT * FROM care_expenses WHERE id = ?').get(id);
      res.status(201).json(expense);
    } catch (error) {
      logger.error('Error creating expense:', error);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  });

  // Get expenses for a senior
  router.get('/expenses/:seniorId', (req: Request, res: Response) => {
    try {
      const expenses = db.prepare(`SELECT ce.*, u.email as paid_by_email FROM care_expenses ce
        JOIN users u ON u.id = ce.paid_by WHERE ce.senior_id = ? ORDER BY ce.created_at DESC`).all(req.params.seniorId);
      res.json(expenses);
    } catch (error) {
      logger.error('Error fetching expenses:', error);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  });

  // Get expense summary for a senior
  router.get('/expenses/summary/:seniorId', (req: Request, res: Response) => {
    try {
      const total = db.prepare('SELECT SUM(amount) as total FROM care_expenses WHERE senior_id = ?').get(req.params.seniorId) as any;
      const byCategory = db.prepare('SELECT category, SUM(amount) as total, COUNT(*) as count FROM care_expenses WHERE senior_id = ? GROUP BY category').all(req.params.seniorId);
      const byPayer = db.prepare('SELECT paid_by, SUM(amount) as total FROM care_expenses WHERE senior_id = ? GROUP BY paid_by').all(req.params.seniorId);
      res.json({ total: total?.total || 0, byCategory, byPayer });
    } catch (error) {
      logger.error('Error fetching expense summary:', error);
      res.status(500).json({ error: 'Failed to fetch expense summary' });
    }
  });

  // Delete expense
  router.delete('/expenses/:id', (req: Request, res: Response) => {
    try {
      db.prepare('DELETE FROM care_expenses WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting expense:', error);
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  });

  // ==================== EVENTS (CALENDAR) ====================

  // Create event
  router.post('/events', (req: Request, res: Response) => {
    try {
      const { seniorId, createdBy, title, description, location, startTime, endTime, eventType, isRecurring, recurrencePattern, reminderMinutes, attendees } = req.body;
      if (!seniorId || !createdBy || !title || !startTime) {
        return res.status(400).json({ error: 'seniorId, createdBy, title, and startTime are required' });
      }
      const id = generateId();
      db.prepare(`INSERT INTO care_events (id, senior_id, created_by, title, description, location, start_time, end_time, event_type, is_recurring, recurrence_pattern, reminder_minutes, attendees)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, seniorId, createdBy, title, description || null, location || null, startTime, endTime || null, eventType || 'appointment', isRecurring ? 1 : 0, recurrencePattern || null, reminderMinutes || null, attendees ? JSON.stringify(attendees) : null);
      const event = db.prepare('SELECT * FROM care_events WHERE id = ?').get(id);
      res.status(201).json(event);
    } catch (error) {
      logger.error('Error creating event:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  });

  // Get events for a senior
  router.get('/events/:seniorId', (req: Request, res: Response) => {
    try {
      const events = db.prepare('SELECT * FROM care_events WHERE senior_id = ? ORDER BY start_time ASC').all(req.params.seniorId);
      res.json(events);
    } catch (error) {
      logger.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  // Update event
  router.patch('/events/:id', (req: Request, res: Response) => {
    try {
      const { title, description, location, startTime, endTime, eventType, status, reminderMinutes } = req.body;
      const existing = db.prepare('SELECT * FROM care_events WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Event not found' });
      db.prepare(`UPDATE care_events SET
        title = COALESCE(?, title), description = COALESCE(?, description),
        location = COALESCE(?, location), start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time), event_type = COALESCE(?, event_type),
        status = COALESCE(?, status), reminder_minutes = COALESCE(?, reminder_minutes),
        updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(title || null, description || null, location || null, startTime || null, endTime || null, eventType || null, status || null, reminderMinutes || null, req.params.id);
      const updated = db.prepare('SELECT * FROM care_events WHERE id = ?').get(req.params.id);
      res.json(updated);
    } catch (error) {
      logger.error('Error updating event:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  });

  // Delete event
  router.delete('/events/:id', (req: Request, res: Response) => {
    try {
      db.prepare('DELETE FROM care_events WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting event:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  });

  // Get upcoming events (next 7 days)
  router.get('/events/upcoming/:seniorId', (req: Request, res: Response) => {
    try {
      const events = db.prepare(`SELECT * FROM care_events WHERE senior_id = ?
        AND start_time >= datetime('now') AND start_time <= datetime('now', '+7 days')
        AND status = 'scheduled' ORDER BY start_time ASC`).all(req.params.seniorId);
      res.json(events);
    } catch (error) {
      logger.error('Error fetching upcoming events:', error);
      res.status(500).json({ error: 'Failed to fetch upcoming events' });
    }
  });

  return router;
}
