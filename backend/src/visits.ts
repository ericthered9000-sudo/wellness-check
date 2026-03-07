// Doctor Visit Service
import Database, { Database as DatabaseType } from 'better-sqlite3';

export interface DoctorVisit {
  id: string;
  user_id: string;
  doctor_name: string;
  specialty: string;
  date_time: string;
  location: string;
  notes: string;
  reminder_days_before: number;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitReminder {
  id: string;
  visit_id: string;
  user_id: string;
  reminder_type: 'push' | 'in_app';
  scheduled_for: string;
  sent: boolean;
  sent_at?: string;
}

let db: DatabaseType;

export function initVisits(database: DatabaseType) {
  db = database;
  
  // Create visits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctor_visits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      specialty TEXT,
      date_time TEXT NOT NULL,
      location TEXT,
      notes TEXT,
      reminder_days_before INTEGER DEFAULT 1,
      reminder_sent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create reminders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS visit_reminders (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reminder_type TEXT NOT NULL CHECK(reminder_type IN ('push', 'in_app')),
      scheduled_for TEXT NOT NULL,
      sent INTEGER DEFAULT 0,
      sent_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (visit_id) REFERENCES doctor_visits(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('✅ Doctor visits tables initialized');
}

// Generate unique ID
function generateId(): string {
  return `visit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create a new doctor visit
export function createVisit(
  userId: string,
  doctorName: string,
  dateTime: string,
  specialty?: string,
  location?: string,
  notes?: string,
  reminderDaysBefore: number = 1
): DoctorVisit {
  const id = generateId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO doctor_visits (id, user_id, doctor_name, specialty, date_time, location, notes, reminder_days_before, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, userId, doctorName, specialty || '', dateTime, location || '', notes || '', reminderDaysBefore, now, now);

  // Create in-app reminder
  createReminder(id, userId, 'in_app', dateTime, reminderDaysBefore);
  // Create push reminder
  createReminder(id, userId, 'push', dateTime, reminderDaysBefore);

  return {
    id,
    user_id: userId,
    doctor_name: doctorName,
    specialty: specialty || '',
    date_time: dateTime,
    location: location || '',
    notes: notes || '',
    reminder_days_before: reminderDaysBefore,
    reminder_sent: false,
    created_at: now,
    updated_at: now
  };
}

// Create a reminder for a visit
function createReminder(
  visitId: string,
  userId: string,
  type: 'push' | 'in_app',
  visitDateTime: string,
  daysBefore: number
): void {
  const id = `reminder-${type}-${visitId}`;
  const visitDate = new Date(visitDateTime);
  const reminderDate = new Date(visitDate);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);
  reminderDate.setHours(9, 0, 0, 0); // Remind at 9 AM

  // Only create if reminder date is in the future
  if (reminderDate > new Date()) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO visit_reminders (id, visit_id, user_id, reminder_type, scheduled_for, sent)
      VALUES (?, ?, ?, ?, ?, 0)
    `);
    stmt.run(id, visitId, userId, type, reminderDate.toISOString());
  }
}

// Get all visits for a user
export function getVisits(userId: string): DoctorVisit[] {
  const stmt = db.prepare(`SELECT * FROM doctor_visits WHERE user_id = ? ORDER BY date_time ASC`);
  return stmt.all(userId) as DoctorVisit[];
}

// Get upcoming visits (within next 30 days)
export function getUpcomingVisits(userId: string): DoctorVisit[] {
  const now = new Date().toISOString();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const stmt = db.prepare(`
    SELECT * FROM doctor_visits 
    WHERE user_id = ? AND date_time >= ? AND date_time <= ?
    ORDER BY date_time ASC
  `);
  
  return stmt.all(userId, now, thirtyDaysFromNow.toISOString()) as DoctorVisit[];
}

// Get a single visit
export function getVisit(visitId: string): DoctorVisit | null {
  const stmt = db.prepare(`SELECT * FROM doctor_visits WHERE id = ?`);
  return stmt.get(visitId) as DoctorVisit | null;
}

// Update a visit
export function updateVisit(
  visitId: string,
  updates: Partial<Omit<DoctorVisit, 'id' | 'user_id' | 'created_at'>>
): DoctorVisit | null {
  const now = new Date().toISOString();
  const fields: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  values.push(visitId);

  const stmt = db.prepare(`UPDATE doctor_visits SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getVisit(visitId);
}

// Delete a visit
export function deleteVisit(visitId: string): boolean {
  // Delete reminders first
  db.prepare(`DELETE FROM visit_reminders WHERE visit_id = ?`).run(visitId);
  
  // Then delete the visit
  const result = db.prepare(`DELETE FROM doctor_visits WHERE id = ?`).run(visitId);
  return result.changes > 0;
}

// Get pending reminders (for notification service)
export function getPendingReminders(): (VisitReminder & { visit: DoctorVisit })[] {
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    SELECT r.*, 
           v.id as visit_id, v.user_id as visit_user_id, v.doctor_name, v.specialty, 
           v.date_time, v.location, v.notes
    FROM visit_reminders r
    JOIN doctor_visits v ON r.visit_id = v.id
    WHERE r.scheduled_for <= ? AND r.sent = 0
    ORDER BY r.scheduled_for ASC
  `);

  const rows = stmt.all(now) as any[];
  
  return rows.map(row => ({
    id: row.id,
    visit_id: row.visit_id,
    user_id: row.user_id,
    reminder_type: row.reminder_type,
    scheduled_for: row.scheduled_for,
    sent: row.sent === 1,
    visit: {
      id: row.visit_id,
      user_id: row.visit_user_id,
      doctor_name: row.doctor_name,
      specialty: row.specialty,
      date_time: row.date_time,
      location: row.location,
      notes: row.notes,
      reminder_days_before: row.reminder_days_before || 1,
      reminder_sent: false,
      created_at: row.created_at || now,
      updated_at: now
    }
  }));
}

// Mark reminder as sent
export function markReminderSent(reminderId: string): void {
  const now = new Date().toISOString();
  db.prepare(`UPDATE visit_reminders SET sent = 1, sent_at = ? WHERE id = ?`).run(now, reminderId);
}

// Get in-app notifications for a user
export function getUserNotifications(userId: string): any[] {
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    SELECT r.*, v.doctor_name, v.specialty, v.date_time, v.location
    FROM visit_reminders r
    JOIN doctor_visits v ON r.visit_id = v.id
    WHERE r.user_id = ? AND r.reminder_type = 'in_app' AND r.scheduled_for <= ? AND r.sent = 0
    ORDER BY r.scheduled_for ASC
  `);

  return stmt.all(userId, now) || [];
}