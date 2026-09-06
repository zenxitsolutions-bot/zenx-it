import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';

// Centralizes the primitives every timezone-aware call site needs — mirrors wellness-app's own
// server/src/services/timezoneService.js exactly (independent implementation, not a shared
// package — these two apps are deliberately independent deployments, see WellnessDb.js's own
// mirror-not-share convention). Every new date/time-touching call site here should import from
// this file rather than hand-rolling a second copy of date-fns-tz usage.

// Same check used by admin-server/src/schemas/timezone.schema.js's `ianaTimezone` field —
// re-exported here so both places share one implementation instead of two copies of the same
// try/catch.
export function isValidTimezone(value) {
  if (typeof value !== 'string' || !value) return false;
  try {
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// `dateStr` "YYYY-MM-DD", `timeStr` "HH:MM" or "HH:MM:SS" — the wall-clock a staff member typed in
// their own zone. Returns the real UTC instant that wall-clock actually is (DST-correct).
export function wallClockToUtc(dateStr, timeStr, timezone) {
  const time = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return fromZonedTime(`${dateStr}T${time}`, timezone);
}

// The inverse: what calendar date/time/weekday is this UTC instant on the wall clock in `timezone`?
export function utcToZonedParts(date, timezone) {
  const zoned = toZonedTime(date, timezone);
  return {
    year: zoned.getFullYear(),
    month: zoned.getMonth() + 1,
    day: zoned.getDate(),
    hour: zoned.getHours(),
    minute: zoned.getMinutes(),
    weekday: zoned.getDay(),
  };
}

export function formatInZone(date, timezone, pattern = 'EEEE, d MMM yyyy, h:mm a') {
  return formatInTimeZone(date, timezone, pattern);
}

// The one place that encodes "no saved timezone yet -> treat as UTC" — every consumer that reads a
// staff/company/customer-user's timezone for display should go through this instead of repeating
// `?? 'UTC'`. Accepts any row-shaped object with an optional `timezone` field (profiles.timezone,
// users.timezone, companies.timezone — the latter can genuinely be null, unlike the other two which
// default at the DB level).
export function effectiveTimezone(entity) {
  return entity?.timezone || 'UTC';
}
