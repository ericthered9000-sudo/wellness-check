/**
 * Shared utility functions for HomeBeacon app
 */

/**
 * Get wellness score color class based on value
 * Consistent thresholds across all components
 */
export function getScoreColor(score: number | null | undefined): 'good' | 'moderate' | 'low' | 'neutral' {
  if (score === null || score === undefined) return 'neutral';
  if (score >= 80) return 'good';
  if (score >= 50) return 'moderate';
  return 'low';
}

/**
 * Get score description text
 */
export function getScoreDescription(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'Not available';
  if (score >= 80) return 'Excellent - Everything looks great!';
  if (score >= 70) return 'Good - Minor areas to watch';
  if (score >= 50) return 'Fair - Some attention recommended';
  return 'Low - Please check in with family';
}

/**
 * Format time for display (12-hour format)
 */
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Format date and time together
 */
export function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} at ${formatTime(dateStr)}`;
}

/**
 * Get days until a date
 */
export function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

/**
 * Get human-readable days until label
 */
export function getDaysUntilLabel(days: number): string {
  if (days < 0) return 'Past';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `In ${days} days`;
  if (days <= 14) return 'In 1 week';
  if (days <= 30) return `In ${Math.ceil(days / 7)} weeks`;
  return `In ${Math.ceil(days / 30)} month(s)`;
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Z-index scale for consistent layering
 */
export const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 100,
  STICKY: 200,
  FIXED: 300,
  MODAL_BACKDROP: 900,
  MODAL: 1000,
  POPOVER: 1100,
  TOOLTIP: 1200,
  BOTTOM_NAV: 500,
  AD_BANNER: 400,
  EMERGENCY: 1100,
} as const;

/**
 * Minimum touch target size (for accessibility)
 */
export const TOUCH_TARGET_SIZE = 44; // pixels (Apple HIG recommendation)

/**
 * Color thresholds for wellness scores
 */
export const SCORE_THRESHOLDS = {
  GOOD: 80,
  MODERATE: 50,
} as const;