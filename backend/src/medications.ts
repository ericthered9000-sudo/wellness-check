/**
 * Medication Reminders Service
 * Handles medication tracking, scheduling, and adherence
 */

import Database from 'better-sqlite3';

const db = new Database('./wellness.db');

// Initialize medication tables
export function initMedicationTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT,
      unit TEXT,
      instructions TEXT,
      schedule TEXT,
      times TEXT,
      next_due DATETIME,
      last_taken DATETIME,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS medication_logs (
      id TEXT PRIMARY KEY,
      medication_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'taken',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS medication_reminders (
      id TEXT PRIMARY KEY,
      medication_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reminder_time DATETIME NOT NULL,
      sent INTEGER DEFAULT 0,
      sent_at DATETIME,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id);
    CREATE INDEX IF NOT EXISTS idx_medication_logs_user ON medication_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_medication_logs_date ON medication_logs(taken_at);
  `);
}

// Medication type
export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage?: string;
  unit?: string;
  instructions?: string;
  schedule: string; // 'daily', 'twice daily', 'every 8 hours', 'weekly', etc.
  times: string[]; // ['08:00', '20:00']
  next_due?: string;
  last_taken?: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface MedicationLog {
  id: string;
  medication_id: string;
  user_id: string;
  taken_at: string;
  status: 'taken' | 'skipped' | 'missed';
  notes?: string;
  created_at: string;
}

// ==================== Medication CRUD ====================

/**
 * Create a new medication
 */
export function createMedication(data: {
  userId: string;
  name: string;
  dosage?: string;
  unit?: string;
  instructions?: string;
  schedule: string;
  times: string[];
}): Medication {
  const id = `med-${data.userId}-${Date.now()}`;
  const now = new Date().toISOString();
  
  // Calculate next due time
  const nextDue = calculateNextDue(data.times);
  
  const stmt = db.prepare(`
    INSERT INTO medications (id, user_id, name, dosage, unit, instructions, schedule, times, next_due, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  
  stmt.run(
    id,
    data.userId,
    data.name,
    data.dosage || null,
    data.unit || null,
    data.instructions || null,
    data.schedule,
    JSON.stringify(data.times),
    nextDue,
    now,
    now
  );
  
  return getMedication(id)!;
}

/**
 * Get a medication by ID
 */
export function getMedication(id: string): Medication | null {
  const stmt = db.prepare('SELECT * FROM medications WHERE id = ?');
  const row = stmt.get(id) as any;
  
  if (!row) return null;
  
  return {
    ...row,
    times: JSON.parse(row.times || '[]'),
    active: row.active === 1
  };
}

/**
 * Get all medications for a user
 */
export function getMedications(userId: string): Medication[] {
  const stmt = db.prepare('SELECT * FROM medications WHERE user_id = ? AND active = 1 ORDER BY name');
  const rows = stmt.all(userId) as any[];
  
  return rows.map(row => ({
    ...row,
    times: JSON.parse(row.times || '[]'),
    active: row.active === 1
  }));
}

/**
 * Update a medication
 */
export function updateMedication(id: string, data: Partial<{
  name: string;
  dosage: string;
  unit: string;
  instructions: string;
  schedule: string;
  times: string[];
}>): Medication | null {
  const medication = getMedication(id);
  if (!medication) return null;
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.dosage !== undefined) {
    updates.push('dosage = ?');
    values.push(data.dosage);
  }
  if (data.unit !== undefined) {
    updates.push('unit = ?');
    values.push(data.unit);
  }
  if (data.instructions !== undefined) {
    updates.push('instructions = ?');
    values.push(data.instructions);
  }
  if (data.schedule !== undefined) {
    updates.push('schedule = ?');
    values.push(data.schedule);
  }
  if (data.times !== undefined) {
    updates.push('times = ?');
    values.push(JSON.stringify(data.times));
    updates.push('next_due = ?');
    values.push(calculateNextDue(data.times));
  }
  
  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  
  values.push(id);
  
  const stmt = db.prepare(`UPDATE medications SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  
  return getMedication(id);
}

/**
 * Delete (deactivate) a medication
 */
export function deleteMedication(id: string): boolean {
  const stmt = db.prepare('UPDATE medications SET active = 0, updated_at = ? WHERE id = ?');
  const result = stmt.run(new Date().toISOString(), id);
  return result.changes > 0;
}

// ==================== Medication Logs ====================

/**
 * Log a medication as taken
 */
export function logMedicationTaken(medicationId: string, userId: string, notes?: string): MedicationLog {
  const id = `log-${medicationId}-${Date.now()}`;
  const now = new Date().toISOString();
  
  // Create log entry
  const logStmt = db.prepare(`
    INSERT INTO medication_logs (id, medication_id, user_id, taken_at, status, notes, created_at)
    VALUES (?, ?, ?, ?, 'taken', ?, ?)
  `);
  logStmt.run(id, medicationId, userId, now, notes || null, now);
  
  // Update medication's last_taken
  const medStmt = db.prepare('UPDATE medications SET last_taken = ?, next_due = ? WHERE id = ?');
  const medication = getMedication(medicationId);
  const nextDue = medication ? calculateNextDue(medication.times) : null;
  medStmt.run(now, nextDue, medicationId);
  
  return {
    id,
    medication_id: medicationId,
    user_id: userId,
    taken_at: now,
    status: 'taken',
    notes,
    created_at: now
  };
}

/**
 * Skip a medication dose
 */
export function logMedicationSkipped(medicationId: string, userId: string, reason?: string): MedicationLog {
  const id = `log-${medicationId}-${Date.now()}`;
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO medication_logs (id, medication_id, user_id, taken_at, status, notes, created_at)
    VALUES (?, ?, ?, ?, 'skipped', ?, ?)
  `);
  stmt.run(id, medicationId, userId, now, reason || null, now);
  
  // Update next_due
  const medication = getMedication(medicationId);
  if (medication) {
    const nextDue = calculateNextDue(medication.times);
    db.prepare('UPDATE medications SET next_due = ? WHERE id = ?').run(nextDue, medicationId);
  }
  
  return {
    id,
    medication_id: medicationId,
    user_id: userId,
    taken_at: now,
    status: 'skipped',
    notes: reason,
    created_at: now
  };
}

/**
 * Get medication logs for a user
 */
export function getMedicationLogs(userId: string, days: number = 7): (MedicationLog & { medication_name: string })[] {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stmt = db.prepare(`
    SELECT ml.*, m.name as medication_name
    FROM medication_logs ml
    JOIN medications m ON ml.medication_id = m.id
    WHERE ml.user_id = ? AND ml.taken_at >= ?
    ORDER BY ml.taken_at DESC
  `);
  
  const rows = stmt.all(userId, startDate.toISOString()) as any[];
  
  return rows.map(row => ({
    ...row,
    status: row.status as 'taken' | 'skipped' | 'missed'
  }));
}

/**
 * Get medication logs for a specific medication
 */
export function getMedicationLogsByMed(medicationId: string, days: number = 30): MedicationLog[] {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stmt = db.prepare(`
    SELECT * FROM medication_logs
    WHERE medication_id = ? AND taken_at >= ?
    ORDER BY taken_at DESC
  `);
  
  const rows = stmt.all(medicationId, startDate.toISOString()) as any[];
  
  return rows.map(row => ({
    ...row,
    status: row.status as 'taken' | 'skipped' | 'missed'
  }));
}

// ==================== Adherence Calculation ====================

/**
 * Calculate medication adherence percentage
 */
export function calculateAdherence(userId: string, days: number = 7): {
  overall: number;
  byMedication: { medicationId: string; medicationName: string; adherence: number }[];
} {
  const medications = getMedications(userId);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const byMedication: { medicationId: string; medicationName: string; adherence: number }[] = [];
  let totalScheduled = 0;
  let totalTaken = 0;
  
  for (const med of medications) {
    // Get logs for this medication
    const logs = getMedicationLogsByMed(med.id, days);
    const taken = logs.filter(l => l.status === 'taken').length;
    const scheduled = med.times.length * days; // doses per day * days
    
    totalScheduled += scheduled;
    totalTaken += taken;
    
    byMedication.push({
      medicationId: med.id,
      medicationName: med.name,
      adherence: scheduled > 0 ? Math.round((taken / scheduled) * 100) : 0
    });
  }
  
  const overall = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;
  
  return { overall, byMedication };
}

/**
 * Get medications due today
 */
export function getMedicationsDueToday(userId: string): (Medication & { dueTimes: string[] })[] {
  const medications = getMedications(userId);
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM
  
  return medications.map(med => {
    const dueTimes = med.times.filter(time => time >= currentTime);
    return { ...med, dueTimes };
  }).filter(med => med.dueTimes.length > 0);
}

/**
 * Get overdue medications (missed doses)
 */
export function getOverdueMedications(userId: string): (Medication & { overdueTime: string })[] {
  const medications = getMedications(userId);
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  
  const overdue: (Medication & { overdueTime: string })[] = [];
  
  for (const med of medications) {
    // Check if last_taken is before any scheduled time today
    const todayScheduled = med.times.filter(time => time < currentTime);
    
    if (todayScheduled.length > 0 && (!med.last_taken || !isToday(med.last_taken))) {
      // Hasn't taken any dose today but some were scheduled
      overdue.push({ ...med, overdueTime: todayScheduled[todayScheduled.length - 1] });
    }
  }
  
  return overdue;
}

// ==================== Helper Functions ====================

/**
 * Calculate next due time based on schedule
 */
function calculateNextDue(times: string[]): string | null {
  if (!times || times.length === 0) return null;
  
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  
  // Find the next time that's in the future
  const nextTime = times.find(t => t > currentTime);
  
  if (nextTime) {
    // Today
    const next = new Date(now);
    const [hours, minutes] = nextTime.split(':').map(Number);
    next.setHours(hours, minutes, 0, 0);
    return next.toISOString();
  } else {
    // Tomorrow
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    const [hours, minutes] = times[0].split(':').map(Number);
    next.setHours(hours, minutes, 0, 0);
    return next.toISOString();
  }
}

/**
 * Check if a date is today
 */
function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// Initialize tables on module load
initMedicationTables();