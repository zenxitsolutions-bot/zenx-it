import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { calendarDayRange } from './availability.js';

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

// Display and notifications follow the person's most recently detected device zone. Weekly
// availability and recurring schedules deliberately continue to use the separate saved timezone.
// A not-yet-converted enquiry has neither field, so its honest fallback remains labelled UTC.
export function effectiveTimezone(entity) {
  if (isValidTimezone(entity?.detectedTimezone)) return entity.detectedTimezone;
  return isValidTimezone(entity?.timezone) ? entity.timezone : 'UTC';
}

// Inclusive query bounds for the viewer's civil day. Offset CALENDAR days before conversion,
// never UTC milliseconds: a daylight-saving transition can make a day 23 or 25 hours long.
export function zonedDayBounds(date, timezone, dayOffset = 0) {
  const zone = isValidTimezone(timezone) ? timezone : 'UTC';
  const [year, month, day] = formatInZone(date, zone, 'yyyy-MM-dd').split('-').map(Number);
  const civilDate = new Date(Date.UTC(year, month - 1, day + dayOffset)).toISOString().slice(0, 10);
  const { dayStart, dayEnd } = calendarDayRange(civilDate, zone);
  return { dayStart, dayEnd: new Date(dayEnd.getTime() - 1) };
}
