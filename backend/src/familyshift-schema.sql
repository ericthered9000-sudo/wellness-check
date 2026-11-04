-- FamilyShift Database Schema
-- Run this migration to add caregiver coordination tables
-- These tables extend HomeBeacon with family coordination features

-- ============================================
-- CAREGIVER TASKS
-- ============================================
-- Tasks assigned to family members (e.g., "Pick up prescription", "Take Mom to doctor")
CREATE TABLE IF NOT EXISTS caregiver_tasks (
  id TEXT PRIMARY KEY,
  senior_id TEXT NOT NULL,
  assigned_to TEXT NOT NULL,           -- user_id of family member
  created_by TEXT NOT NULL,            -- user_id of task creator
  title TEXT NOT NULL,
  description TEXT,
  due_date DATETIME,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
  completed_at DATETIME,
  completed_by TEXT,                    -- user_id who marked complete
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (senior_id) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (completed_by) REFERENCES users(id)
);

-- Index for quick lookup of tasks by senior
CREATE INDEX IF NOT EXISTS idx_tasks_senior ON caregiver_tasks(senior_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON caregiver_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON caregiver_tasks(status);

-- ============================================
-- CARE JOURNAL
-- ============================================
-- Daily notes about senior's wellbeing (e.g., "Mom ate well today", "New medication started")
CREATE TABLE IF NOT EXISTS care_journal (
  id TEXT PRIMARY KEY,
  senior_id TEXT NOT NULL,
  author_id TEXT NOT NULL,              -- user_id of person writing entry
  category TEXT NOT NULL CHECK(category IN ('wellness', 'medical', 'mood', 'activities', 'incident', 'notes')),
  content TEXT NOT NULL,
  mood TEXT CHECK(mood IN ('great', 'good', 'okay', 'poor', 'concerning')),
  photo_url TEXT,                       -- optional photo attachment
  is_private INTEGER DEFAULT 0,        -- if 1, only author can see
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (senior_id) REFERENCES users(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Index for journal entries by senior and date
CREATE INDEX IF NOT EXISTS idx_journal_senior ON care_journal(senior_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON care_journal(created_at);
CREATE INDEX IF NOT EXISTS idx_journal_category ON care_journal(category);

-- ============================================
-- CARE EXPENSES
-- ============================================
-- Track expenses related to senior care (medical bills, groceries, transportation)
CREATE TABLE IF NOT EXISTS care_expenses (
  id TEXT PRIMARY KEY,
  senior_id TEXT NOT NULL,
  paid_by TEXT NOT NULL,                -- user_id who paid
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('medical', 'groceries', 'transportation', 'housing', 'caregiver', 'other')),
  description TEXT,
  receipt_url TEXT,                     -- optional receipt image
  is_reimbursable INTEGER DEFAULT 0,    -- if 1, marked for reimbursement
  reimbursed_to TEXT,                   -- user_id who was reimbursed
  reimbursed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (senior_id) REFERENCES users(id),
  FOREIGN KEY (paid_by) REFERENCES users(id),
  FOREIGN KEY (reimbursed_to) REFERENCES users(id)
);

-- Index for expenses by senior and date
CREATE INDEX IF NOT EXISTS idx_expenses_senior ON care_expenses(senior_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON care_expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON care_expenses(category);

-- ============================================
-- CARE EVENTS (CALENDAR)
-- ============================================
-- Calendar events for senior care (doctor appointments, family visits, etc.)
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
  recurrence_pattern TEXT,              -- JSON: {"frequency": "weekly", "days": ["mon", "wed"], "until": "2026-12-31"}
  reminder_minutes INTEGER,              -- minutes before event to send reminder
  attendees TEXT,                       -- JSON array of user_ids
  status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (senior_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Index for events by senior and date
CREATE INDEX IF NOT EXISTS idx_events_senior ON care_events(senior_id);
CREATE INDEX IF NOT EXISTS idx_events_start ON care_events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_type ON care_events(event_type);

-- ============================================
-- EXPENSE SPLIT TRACKING
-- ============================================
-- Track who owes what for shared expenses
CREATE TABLE IF NOT EXISTS expense_splits (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  user_id TEXT NOT NULL,               -- person who owes this portion
  amount_owed DECIMAL(10,2) NOT NULL,
  is_paid INTEGER DEFAULT 0,           -- if 1, this portion has been paid
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES care_expenses(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index for splits by expense and user
CREATE INDEX IF NOT EXISTS idx_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_splits_user ON expense_splits(user_id);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
-- Auto-update updated_at timestamp on row changes
CREATE TRIGGER IF NOT EXISTS update_tasks_timestamp
AFTER UPDATE ON caregiver_tasks
BEGIN
  UPDATE caregiver_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_journal_timestamp
AFTER UPDATE ON care_journal
BEGIN
  UPDATE care_journal SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_events_timestamp
AFTER UPDATE ON care_events
BEGIN
  UPDATE care_events SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;