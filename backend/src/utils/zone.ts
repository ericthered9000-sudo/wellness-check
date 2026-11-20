/**
 * Timezone helpers for user-local scheduling (vc30).
 *
 * Converts wall-clock times (e.g. "09:00" or "20:26") in a user's IANA
 * timezone into true UTC instants, DST-safe. Used by the medication
 * next_due computation and appointment reminders so local fire times hold
 * across timezone/DST boundaries instead of being reinterpreted as
 * server-local (UTC) wall-clock time on the backend host.
 */

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * Get the Y/M/D/hour/minute wall-clock parts of a Date in a timezone.
 */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const m: Record<string, string> = {};
  for (const { type, value } of dtf.formatToParts(date)) {
    if (type !== 'literal') m[type] = value;
  }
  return {
    year: Number(m.year),
    month: Number(m.month),
    day: Number(m.day),
    hour: m.hour === '24' ? 0 : Number(m.hour),
    minute: Number(m.minute),
  };
}

/**
 * Offset (ms) of a timezone at a given instant, via the 'longOffset'
 * timeZoneName (e.g. "GMT-06:00"). Returns 0 (UTC) if unresolvable.
 */
function zoneOffsetMs(date: Date, timeZone: string): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'longOffset',
    });
    const m: Record<string, string> = {};
    for (const { type, value } of dtf.formatToParts(date)) {
      if (type !== 'literal') m[type] = value;
    }
    const match = /GMT([+-])(\d{2}):(\d{2})/.exec(m.timeZoneName || '');
    if (!match) return 0;
    const sign = match[1] === '-' ? -1 : 1;
    return sign * ((Number(match[2]) * 60) + Number(match[3])) * 60000;
  } catch {
    return 0;
  }
}

/**
 * Convert a wall-clock date/time in a timezone to the corresponding UTC
 * Date. Two-pass computation handles DST transitions on the target day.
 * Day/month/year overflow (e.g. day - 1 rolling across month start) is
 * handled by Date.UTC normalization.
 */
export function wallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let adjusted = guess - zoneOffsetMs(new Date(guess), timeZone);
  adjusted = guess - zoneOffsetMs(new Date(adjusted), timeZone);
  return new Date(adjusted);
}

/**
 * Resolve a user's IANA timezone from senior_profiles.timezone.
 * Falls back to 'America/Chicago' (the schema default) when no profile row
 * exists or the lookup fails.
 */
export function getUserTimezone(db: any, userId: string): string {
  try {
    const row = db
      .prepare('SELECT timezone FROM senior_profiles WHERE user_id = ?')
      .get(userId) as { timezone?: string } | undefined;
    if (row && row.timezone) return row.timezone;
  } catch {
    // senior_profiles unavailable or db not ready — fall through to default
  }
  return 'America/Chicago';
}
