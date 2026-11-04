/**
 * FamilyShift Database Migration
 * 
 * Run this once to add caregiver coordination tables to HomeBeacon.
 * These tables enable task management, care journal, expense tracking, and calendar events.
 * 
 * Usage:
 *   import { initFamilyShiftTables } from './familyshift';
 *   await initFamilyShiftTables(db);
 */

import * as betterSqlite3 from 'better-sqlite3';

export function initFamilyShiftTables(db: betterSqlite3.Database): void {
  console.log('[FamilyShift] Initializing tables...');

  // ============================================
  // CAREGIVER TASKS
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS caregiver_tasks (
      id TEXT PRIMARY KEY,
      senior_id TEXT NOT NULL,
      assigned_to TEXT NOT NULL,
      created_by TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATETIME,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
      completed_at DATETIME,
      completed_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (senior_id) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (completed_by) REFERENCES users(id)
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_senior ON caregiver_tasks(senior_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON caregiver_tasks(assigned_to)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON caregiver_tasks(status)`);

  // ============================================
  // CARE JOURNAL
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS care_journal (
      id TEXT PRIMARY KEY,
      senior_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('wellness', 'medical', 'mood', 'activities', 'incident', 'notes')),
      content TEXT NOT NULL,
      mood TEXT CHECK(mood IN ('great', 'good', 'okay', 'poor', 'concerning')),
      photo_url TEXT,
      is_private INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (senior_id) REFERENCES users(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_journal_senior ON care_journal(senior_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_journal_date ON care_journal(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_journal_category ON care_journal(category)`);

  // ============================================
  // CARE EXPENSES
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS care_expenses (
      id TEXT PRIMARY KEY,
      senior_id TEXT NOT NULL,
      paid_by TEXT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('medical', 'groceries', 'transportation', 'housing', 'caregiver', 'other')),
      description TEXT,
      receipt_url TEXT,
      is_reimbursable INTEGER DEFAULT 0,
      reimbursed_to TEXT,
      reimbursed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (senior_id) REFERENCES users(id),
      FOREIGN KEY (paid_by) REFERENCES users(id),
      FOREIGN KEY (reimbursed_to) REFERENCES users(id)
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_expenses_senior ON care_expenses(senior_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON care_expenses(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_expenses_category ON care_expenses(category)`);

  // ============================================
  // CARE EVENTS (CALENDAR)
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS care_events (
      id TEXT PRIMARY KEY,
      senior_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      event_type TEXT DEFAULT 'appointment' CHECK(event_type IN ('appointment', 'visit', 'medication', 'task', 'reminder', 'other')),
      is_recurring INTEGER DEFAULT 0,
      recurrence_pattern TEXT,
      reminder_minutes INTEGER,
      attendees TEXT,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (senior_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_events_senior ON care_events(senior_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_events_start ON care_events(start_time)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_events_type ON care_events(event_type)`);

  // ============================================
  // EXPENSE SPLIT TRACKING
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_splits (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount_owed DECIMAL(10,2) NOT NULL,
      is_paid INTEGER DEFAULT 0,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (expense_id) REFERENCES care_expenses(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_splits_expense ON expense_splits(expense_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_splits_user ON expense_splits(user_id)`);

  console.log('[FamilyShift] Tables initialized successfully');
}

// ============================================
// API HELPER FUNCTIONS
// ============================================

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Parse JSON field safely
export function parseJsonField<T>(field: string | null, defaultValue: T): T {
  if (!field) return defaultValue;
  try {
    return JSON.parse(field);
  } catch {
    return defaultValue;
  }
}