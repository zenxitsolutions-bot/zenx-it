import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';

// Centralizes the primitives every NEW timezone-aware call site needs, so none of them hand-roll a
// second copy of date-fns-tz usage. Deliberately does NOT touch availability.js/
// consultationScheduleService.js's own existing conversions — those are already correct and
// already centralized within their own module; this service is for everything built after them
// (reminderScheduler.js, callNotifications.js's client-side email, the profile-preference API).

// Same check used by server/src/schemas/user.schema.js's `timezone` zod field — re-exported here so
// both places share one implementation instead of two copies of the same try/catch.
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

// `dateStr` "YYYY-MM-DD", `timeStr` "HH:MM" — the wall-clock a user typed in their own zone.
// Returns the real UTC instant that wall-clock actually is (DST-correct: the same local time can
// be a different UTC offset depending on the calendar date, which fromZonedTime resolves fresh
// every call rather than by applying a fixed offset).
export function wallClockToUtc(dateStr, timeStr, timezone) {
  return fromZonedTime(`${dateStr}T${timeStr}`, timezone);
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
// user/attendee's timezone for display should go through this instead of repeating `?? 'UTC'`.
// Accepts a full user row or a bare {name, email} enquiry-contact stand-in (no timezone field at
// all, e.g. callNotifications.js's not-yet-converted-lead attendee) — both fall back to UTC, since
// neither has a reliable per-person zone signal until they have a real account.
export function effectiveTimezone(entity) {
  return entity?.timezone || 'UTC';
}
