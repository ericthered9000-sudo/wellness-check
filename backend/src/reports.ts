/**
 * Weekly Wellness Reports Service
 * Generates and stores weekly summary reports
 */

import Database from 'better-sqlite3';

const db = new Database('./wellness.db');

// Initialize weekly reports table
export function initReportsTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id TEXT PRIMARY KEY,
      senior_id TEXT NOT NULL,
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,
      avg_wellness_score REAL,
      steps_avg INTEGER,
      heart_rate_avg REAL,
      sleep_avg REAL,
      medication_adherence REAL,
      insights TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (senior_id) REFERENCES users(id),
      UNIQUE(senior_id, week_start)
    );
  `);
}

// Types
export interface WeeklyReport {
  id: string;
  senior_id: string;
  week_start: string;
  week_end: string;
  avg_wellness_score: number;
  steps_avg: number;
  heart_rate_avg: number;
  sleep_avg: number;
  medication_adherence: number;
  insights: string;
  created_at: string;
}

// ==================== Report Generation ====================

/**
 * Generate a weekly report for a senior
 */
export function generateWeeklyReport(seniorId: string, weekStart?: string): WeeklyReport {
  const now = new Date();
  const startDate = weekStart ? new Date(weekStart) : getMonday(now);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  const weekStartStr = startDate.toISOString().split('T')[0];
  const weekEndStr = endDate.toISOString().split('T')[0];
  
  // Fetch data from all sources
  const wellnessScores = getWellnessScores(seniorId, weekStartStr, weekEndStr);
  const stepSummaries = getStepSummaries(seniorId, weekStartStr, weekEndStr);
  const heartRateReadings = getHeartRateReadings(seniorId, weekStartStr, weekEndStr);
  const sleepData = getSleepData(seniorId, weekStartStr, weekEndStr);
  const adherenceData = getMedicationAdherence(seniorId, 7);
  
  // Calculate averages
  const avgWellnessScore = wellnessScores.length > 0 
    ? Math.round(wellnessScores.reduce((sum, s) => sum + s.score, 0) / wellnessScores.length * 100) / 100
    : 0;
  
  const stepsAvg = stepSummaries.length > 0
    ? Math.round(stepSummaries.reduce((sum, s) => sum + s.steps, 0) / stepSummaries.length)
    : 0;
  
  const heartRateAvg = heartRateReadings.length > 0
    ? Math.round(heartRateReadings.reduce((sum, h) => sum + h.bpm, 0) / heartRateReadings.length * 10) / 10
    : 0;
  
  const sleepAvg = sleepData.length > 0
    ? Math.round(sleepData.reduce((sum, s) => sum + s.duration_minutes, 0) / sleepData.length / 60 * 10) / 10
    : 0;
  
  const medicationAdherence = adherenceData.overall;
  
  // Generate insights
  const insights = generateInsights({
    avgWellnessScore,
    stepsAvg,
    heartRateAvg,
    sleepAvg,
    medicationAdherence
  });
  
  const id = `report-${seniorId}-${weekStartStr}`;
  
  // Store report
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO weekly_reports (id, senior_id, week_start, week_end, avg_wellness_score, steps_avg, heart_rate_avg, sleep_avg, medication_adherence, insights, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    seniorId,
    weekStartStr,
    weekEndStr,
    avgWellnessScore,
    stepsAvg,
    heartRateAvg,
    sleepAvg,
    medicationAdherence,
    insights,
    new Date().toISOString()
  );
  
  return {
    id,
    senior_id: seniorId,
    week_start: weekStartStr,
    week_end: weekEndStr,
    avg_wellness_score: avgWellnessScore,
    steps_avg: stepsAvg,
    heart_rate_avg: heartRateAvg,
    sleep_avg: sleepAvg,
    medication_adherence: medicationAdherence,
    insights,
    created_at: new Date().toISOString()
  };
}

/**
 * Get weekly report by senior ID and week start date
 */
export function getWeeklyReport(seniorId: string, weekStart: string): WeeklyReport | null {
  const stmt = db.prepare(`
    SELECT * FROM weekly_reports 
    WHERE senior_id = ? AND week_start = ?
  `);
  
  const row = stmt.get(seniorId, weekStart) as any;
  
  if (!row) {
    // Generate report if it doesn't exist
    return generateWeeklyReport(seniorId, weekStart);
  }
  
  return {
    id: row.id,
    senior_id: row.senior_id,
    week_start: row.week_start,
    week_end: row.week_end,
    avg_wellness_score: row.avg_wellness_score,
    steps_avg: row.steps_avg,
    heart_rate_avg: row.heart_rate_avg,
    sleep_avg: row.sleep_avg,
    medication_adherence: row.medication_adherence,
    insights: row.insights,
    created_at: row.created_at
  };
}

/**
 * Get all weekly reports for a senior (last 8 weeks)
 */
export function getWeeklyReports(seniorId: string, weeks: number = 8): WeeklyReport[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));
  
  const stmt = db.prepare(`
    SELECT * FROM weekly_reports 
    WHERE senior_id = ? AND week_start >= ?
    ORDER BY week_start DESC
  `);
  
  const rows = stmt.all(seniorId, cutoffDate.toISOString().split('T')[0]) as any[];
  
  return rows.map(row => ({
    id: row.id,
    senior_id: row.senior_id,
    week_start: row.week_start,
    week_end: row.week_end,
    avg_wellness_score: row.avg_wellness_score,
    steps_avg: row.steps_avg,
    heart_rate_avg: row.heart_rate_avg,
    sleep_avg: row.sleep_avg,
    medication_adherence: row.medication_adherence,
    insights: row.insights,
    created_at: row.created_at
  }));
}

// ==================== Data Acquisition Helpers ====================

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWellnessScores(seniorId: string, startDate: string, endDate: string): { score: number }[] {
  const stmt = db.prepare(`
    SELECT score FROM wellness_scores 
    WHERE senior_id = ? AND date >= ? AND date <= ?
  `);
  return stmt.all(seniorId, startDate, endDate) as any[];
}

function getStepSummaries(seniorId: string, startDate: string, endDate: string): { steps: number }[] {
  const stmt = db.prepare(`
    SELECT steps FROM step_summaries 
    WHERE user_id = ? AND date >= ? AND date <= ?
  `);
  return stmt.all(seniorId, startDate, endDate) as any[];
}

function getHeartRateReadings(seniorId: string, startDate: string, endDate: string): { bpm: number }[] {
  const stmt = db.prepare(`
    SELECT bpm FROM heart_rate_readings 
    WHERE user_id = ? AND recorded_at >= ? AND recorded_at <= ?
  `);
  return stmt.all(seniorId, startDate, endDate) as any[];
}

function getSleepData(seniorId: string, startDate: string, endDate: string): { duration_minutes: number }[] {
  const stmt = db.prepare(`
    SELECT duration_minutes FROM sleep_sessions 
    WHERE user_id = ? AND start_time >= ? AND end_time <= ?
  `);
  return stmt.all(seniorId, startDate, endDate) as any[];
}

function getMedicationAdherence(seniorId: string, days: number): { overall: number; byMedication: any[] } {
  const medicationsStmt = db.prepare(`
    SELECT * FROM medications WHERE user_id = ? AND active = 1
  `);
  const medications = medicationsStmt.all(seniorId) as any[];
  
  let totalScheduled = 0;
  let totalTaken = 0;
  
  for (const med of medications) {
    // Count scheduled doses
    const times = JSON.parse(med.times || '[]');
    totalScheduled += times.length * days;
    
    // Count taken doses
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const logsStmt = db.prepare(`
      SELECT COUNT(*) as count FROM medication_logs 
      WHERE medication_id = ? AND taken_at >= ? AND status = 'taken'
    `);
    
    const logCount = logsStmt.get(med.id, startDate.toISOString()) as any;
    totalTaken += logCount.count;
  }
  
  const overall = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 100;
  
  return { overall, byMedication: [] };
}

// ==================== Insights Generation ====================

function generateInsights(data: {
  avgWellnessScore: number;
  stepsAvg: number;
  heartRateAvg: number;
  sleepAvg: number;
  medicationAdherence: number;
}): string {
  const insights: string[] = [];
  
  // Wellness score insights
  if (data.avgWellnessScore >= 80) {
    insights.push('Great job! Your wellness score is consistently high.');
  } else if (data.avgWellnessScore >= 60) {
    insights.push('Your wellness score is holding up well. Small improvements could make a big difference.');
  } else {
    insights.push('Your wellness score has been lower than usual. Consider resting more or checking in with a healthcare provider.');
  }
  
  // Steps insights
  if (data.stepsAvg >= 8000) {
    insights.push('Excellent step count! You\'re meeting daily activity goals.');
  } else if (data.stepsAvg >= 5000) {
    insights.push('Good activity level. Try to add a few more steps each day.');
  } else {
    insights.push('Your activity level is low. Consider light walks or gentle exercise.');
  }
  
  // Sleep insights
  if (data.sleepAvg >= 7) {
    insights.push('Great sleep! You\'re getting the recommended 7+ hours per night.');
  } else if (data.sleepAvg >= 6) {
    insights.push('Your sleep is a bit low. Aim for 7-8 hours for optimal health.');
  } else {
    insights.push('Your sleep has been poor recently. Consider a bedtime routine or relaxation techniques.');
  }
  
  // Heart rate insights
  if (data.heartRateAvg >= 60 && data.heartRateAvg <= 100) {
    insights.push('Your heart rate is in the normal range (60-100 BPM).');
  } else if (data.heartRateAvg > 100) {
    insights.push('Your heart rate has been elevated. Consider resting and monitoring.');
  } else {
    insights.push('Your heart rate has been lower than usual. This may be normal for you.');
  }
  
  // Medication adherence
  if (data.medicationAdherence >= 95) {
    insights.push('Perfect medication adherence! Keep it up.');
  } else if (data.medicationAdherence >= 80) {
    insights.push('Good job taking most of your medications. Try to improve consistency.');
  } else {
    insights.push('Your medication adherence needs attention. Consider using reminders.');
  }
  
  return insights.join(' ');
}

// Initialize on module load
initReportsTable();
