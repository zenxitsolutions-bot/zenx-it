import { fromZonedTime } from 'date-fns-tz';

// Full IANA list when the runtime supports it (all evergreen browsers + Node 18+) — shared by
// TimezoneField.jsx (dietitian self-service) and the admin Edit Dietitian page's own timezone
// field, so the two never drift on which zones are offered.
export const TIMEZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];

// Spec §2026-round2-fixes item 7: "label the timezone in the UI" — a client viewing available
// slots needs to know which timezone the times are shown in (their own browser's), since the
// dietitian's configured hours are stored in a different zone entirely.
export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// IANA aliases such as Asia/Kolkata and Asia/Calcutta describe the same time zone.
export function canonicalTimezone(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

export function resolveViewerTimezone(user, detected = browserTimezone()) {
  const timezone = canonicalTimezone(detected) || canonicalTimezone(user?.detectedTimezone)
    || canonicalTimezone(user?.timezone) || 'UTC';
  // Only the legacy, never-initialized UTC default falls back to the device. After first
  // detection, even a saved UTC schedule stays UTC when its owner travels.
  const saved = canonicalTimezone(user?.timezone);
  const scheduleTimezone = saved && (saved !== 'UTC' || user?.detectedTimezone) ? saved : timezone;
  return { timezone, scheduleTimezone, browserTimezone: timezone, source: 'browser', mismatch: scheduleTimezone !== timezone };
}

// Do not let a slow automatic update replace a newer profile edit or another signed-in user.
export function mergeDetectedTimezoneUpdate(current, requested, updated) {
  const id = (user) => user?._id ?? user?.id;
  if (!current || id(current) !== id(requested) || id(updated) !== id(requested)
    || !canonicalTimezone(updated.detectedTimezone)) return current;
  return {
    ...current,
    detectedTimezone: updated.detectedTimezone,
    timezone: current.timezone === requested.timezone ? updated.timezone : current.timezone,
  };
}

// Civil YYYY-MM-DD of `value` as seen in `timezone` — used for the booking date picker so
// "today" and a rescheduled call's day follow the viewer, not UTC's date slice.
export function zonedCalendarDate(value = new Date(), timezone = browserTimezone()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((entry) => entry.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function todayDateValue(timezone = browserTimezone()) {
  return zonedCalendarDate(new Date(), timezone);
}

// "GMT+5:30" — a universally-renderable offset label, since not every IANA zone has a short
// abbreviation (IST/PST-style) in every locale's data, but every zone has a GMT offset.
export function timezoneOffsetLabel(timezone = browserTimezone(), date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' }).formatToParts(date);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
}

// Renders a real instant (Date/ISO string) as a labelled wall-clock time in a specific zone — the
// primitive behind every "X sees: {time}" dual-timezone preview (SlotPicker.jsx,
// DietitianCallFormDialog.jsx). Uses native Intl (not date-fns-tz's formatInTimeZone) since the
// `timeZone` option is already DST-correct and format.js's formatTime/formatDate cover the pattern.
export function formatInZone(value, timezone) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(value));
}

// The inverse: a wall-clock "YYYY-MM-DDTHH:mm" typed/selected in `timezone` -> the real UTC instant
// it represents (DST-correct via date-fns-tz's fromZonedTime, matching the server's own
// timezoneService.js#wallClockToUtc so client-computed previews and server-computed storage always
// agree). Returns an ISO string so it can go straight into a request body.
export function zonedTimeToUtcIso(localDateTimeString, timezone) {
  return fromZonedTime(localDateTimeString, timezone).toISOString();
}
