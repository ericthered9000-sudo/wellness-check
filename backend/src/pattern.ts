// Pattern detection and wellness scoring logic

export interface WellnessScore {
  score: number;
  factors: {
    activity: number;
    consistency: number;
    routine: number;
    total: number;
  };
}

export interface ActivityStats {
  movementCount: number;
  locationChanges: number;
  screenTime: number;
  chargingEvents: number;
}

/**
 * Analyze patterns and generate wellness score
 */
export function analyzeWellness(db: any, userId: string): WellnessScore {
  // Get recent activity (last 24 hours)
  const recentActivity = db.prepare(`
    SELECT 
      type,
      COUNT(*) as count,
      MAX(timestamp) as last_timestamp
    FROM activity_events 
    WHERE user_id = ? AND timestamp >= datetime('now', '-24 hours')
    GROUP BY type
  `).all(userId) as any[];

  // Calculate activity score
  let activityScore = 50;
  const activityMap: Record<string, number> = {};
  recentActivity.forEach((a: any) => {
    activityMap[a.type] = a.count;
  });

  // Adjust based on activity type balance
  const motionCount = activityMap['motion'] || 0;
  const locationCount = activityMap['location'] || 0;
  const screenCount = activityMap['screen'] || 0;
  const chargingCount = activityMap['charging'] || 0;

  if (motionCount > 5) activityScore += 10;
  if (locationCount > 3) activityScore += 10;
  if (screenCount > 2) activityScore += 5;
  if (chargingCount > 0) activityScore += 5;

  activityScore = Math.min(100, activityScore);

  // Calculate consistency score (based on baseline variance)
  const consistencyScore = 80; // Base score - would be calculated from 7-day comparison

  // Calculate routine score (based on expected patterns)
  let routineScore = 60;
  
  // Check charging pattern (should charge overnight)
  const lastCharging = db.prepare(`
    SELECT MAX(timestamp) as last_charge FROM activity_events 
    WHERE user_id = ? AND type = 'charging'
  `).get(userId) as { last_charge: string | null };
  
  if (lastCharging.last_charge && isRecent(lastCharging.last_charge, 12)) {
    routineScore += 20;
  }

  // Calculate overall score
  const score = Math.round(
    activityScore * 0.4 +
    consistencyScore * 0.3 +
    routineScore * 0.3
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    factors: {
      activity: activityScore,
      consistency: consistencyScore,
      routine: routineScore,
      total: score
    }
  };
}

/**
 * Check if timestamp is within last N hours
 */
function isRecent(timestamp: string, hours: number): boolean {
  const then = new Date(timestamp).getTime();
  const now = Date.now();
  const diffHours = (now - then) / (1000 * 60 * 60);
  return diffHours < hours;
}

/**
 * Check for alerts based on patterns
 */
export function checkForAlerts(db: any, userId: string): string[] {
  const alerts: string[] = [];

  // Check for no movement in 12 hours during normal awake hours (6am-10pm)
  const lastMotion = db.prepare(`
    SELECT MAX(timestamp) as last FROM activity_events 
    WHERE user_id = ? AND type = 'motion'
  `).get(userId) as { last: string | null };

  if (lastMotion.last) {
    const lastMotionDate = new Date(lastMotion.last).getTime();
    const now = Date.now();
    const hoursSinceMotion = (now - lastMotionDate) / (1000 * 60 * 60);

    const currentHour = new Date().getHours();
    if (hoursSinceMotion > 12 && currentHour >= 6 && currentHour <= 22) {
      alerts.push('No movement detected in over 12 hours during awake time');
    }
  }

  // Check charging routine
  const lastCharging = db.prepare(`
    SELECT timestamp FROM activity_events 
    WHERE user_id = ? AND type = 'charging'
    ORDER BY timestamp DESC LIMIT 1
  `).get(userId) as { timestamp: string | null };

  if (lastCharging.timestamp) {
    const chargingDate = new Date(lastCharging.timestamp);
    const currentHour = new Date().getHours();
    
    // If it's morning and phone wasn't charged overnight (6pm-6am)
    if (currentHour >= 6 && currentHour <= 9) {
      const chargingHour = chargingDate.getHours();
      if (chargingHour < 6 || chargingHour > 18) {
        alerts.push('Phone not charged overnight (routine change)');
      }
    }
  }

  return alerts;
}

/**
 * Record wellness score for today
 */
export function recordDailyScore(db: any, userId: string): number {
  const today = new Date().toISOString().split('T')[0];
  const scoreData = analyzeWellness(db, userId);

  // Check if score already exists for today
  const existing = db.prepare(`
    SELECT id FROM wellness_scores 
    WHERE senior_id = ? AND date = ?
  `).get(userId, today) as { id: string } | undefined;

  if (existing) {
    // Update existing
    db.prepare(`
      UPDATE wellness_scores 
      SET score = ?, factors = ?
      WHERE id = ?
    `).run(scoreData.score, JSON.stringify(scoreData.factors), existing.id);
  } else {
    // Insert new
    const id = `${userId}-${today}`;
    db.prepare(`
      INSERT INTO wellness_scores (id, senior_id, date, score, factors)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, today, scoreData.score, JSON.stringify(scoreData.factors));
  }

  return scoreData.score;
}
