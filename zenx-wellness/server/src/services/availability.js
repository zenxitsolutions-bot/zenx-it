// Pure conflict-detection core for the availability feature — no DB access, so it's cheap and
// deterministic to unit test (server/tests/unit/availability.test.js covers every branch here).
// The impure orchestrator that fetches real rows and takes the concurrency-safe lock lives in
// availabilityGuard.js.
//
// Timezone rule (see docs/specs/2026-round2-fixes.md item 7 for the bug this fixes): the weekly
// `workingHours` template and any `exceptions`/`existingCalls` live at different points on the
// wall-clock/instant spectrum, and this module treats them accordingly —
//   - `workingHours[].startTime`/`endTime` are WALL-CLOCK values in the dietitian's own IANA
//     timezone (`timezone` param below, e.g. "Asia/Kolkata") — exactly what the dietitian typed
//     into an <input type="time">, with no UTC conversion baked in at rest.
//   - `exceptions[].startAt`/`endAt`, `existingCalls[].scheduledAt`, and `requestedStart` are all
//     real UTC instants (already unambiguous — comparing two instants needs no timezone at all).
// The ONLY place a timezone conversion belongs is turning a candidate instant into "what wall-clock
// time/weekday is this in the dietitian's zone," done once via date-fns-tz's toZonedTime. Nothing
// here does manual offset arithmetic (no +5.5, no getTimezoneOffset) — see fromZonedTime/toZonedTime
// below, both DST-aware via the IANA tz database instead of a fixed number.
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export const CALL_DURATION_MINUTES = 30;

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

// 'HH:MM' or 'HH:MM:SS' (mysql2 returns TIME columns as strings) -> minutes since midnight.
function parseTimeToMinutes(value) {
  const [h, m] = value.split(':');
  return Number(h) * 60 + Number(m);
}

// A candidate UTC instant's wall-clock minutes-since-midnight AND weekday, as seen in `timezone` —
// the single conversion point the workingHours comparison relies on.
function zonedMinutesAndWeekday(date, timezone) {
  const zoned = toZonedTime(date, timezone);
  return { minutes: zoned.getHours() * 60 + zoned.getMinutes(), weekday: zoned.getDay() };
}

// [aStart, aEnd) intersects [bStart, bEnd) — half-open ranges, so touching endpoints (back-to-back)
// are NOT an overlap.
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function fail(reason, message) {
  return { ok: false, reason, message };
}

// workingHours: [{ weekday: 0-6, startTime: 'HH:MM', endTime: 'HH:MM' }] — weekday/startTime/endTime
//   are all wall-clock in `timezone`, i.e. weekday 1 ("Monday") means Monday *in that zone*, not UTC.
// exceptions: [{ startAt, endAt, kind: 'closed' | 'open', note? }] — real UTC instants
// existingCalls: [{ id, scheduledAt }] — already scoped to this dietitian's still-`scheduled` calls
// requestedStart: Date | ISO string (a real UTC instant)
// durationMinutes: number, defaults to CALL_DURATION_MINUTES
// timezone: dietitian's IANA zone (e.g. "Asia/Kolkata"), defaults to 'UTC' — a dietitian who has
//   never set one keeps exactly today's behavior (UTC-as-local), so this default is what makes
//   introducing the timezone column non-breaking for every existing account.
export function checkAvailability({
  workingHours = [],
  exceptions = [],
  existingCalls = [],
  requestedStart,
  durationMinutes = CALL_DURATION_MINUTES,
  timezone = 'UTC',
}) {
  const start = toDate(requestedStart);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  // 1. Explicit blocks always win, regardless of the weekly template or any 'open' exception —
  // a lunch-break block on an otherwise-open day still blocks that slot.
  const blockingException = exceptions.find(
    (ex) => ex.kind === 'closed' && rangesOverlap(start, end, toDate(ex.startAt), toDate(ex.endAt))
  );
  if (blockingException) {
    return fail('blocked', blockingException.note ? `Blocked: ${blockingException.note}` : 'This time is blocked');
  }

  // 2. An 'open' exception that fully covers the requested slot grants availability regardless of
  // the weekly template (e.g. extra hours on a normally-closed date).
  const coveringOpenException = exceptions.find(
    (ex) => ex.kind === 'open' && toDate(ex.startAt) <= start && toDate(ex.endAt) >= end
  );

  if (!coveringOpenException) {
    // 3. Fall back to the weekly template. No rows at all = never configured = unrestricted
    // (see the schema.sql comment on dietitian_weekly_hours for why this must be opt-in).
    if (workingHours.length > 0) {
      const { minutes: slotStartMin, weekday } = zonedMinutesAndWeekday(start, timezone);
      const dayHours = workingHours.find((wh) => wh.weekday === weekday);
      if (!dayHours) return fail('outside_hours', 'Outside working hours');

      const slotEndMin = slotStartMin + durationMinutes;
      const openMin = parseTimeToMinutes(dayHours.startTime);
      const closeMin = parseTimeToMinutes(dayHours.endTime);
      if (slotStartMin < openMin || slotEndMin > closeMin) {
        return fail('outside_hours', 'Outside working hours');
      }
    }
  }

  // 4. Overlap with an existing call. Half-open ranges make back-to-back appointments (one ends
  // exactly when the other starts) allowed, not a conflict.
  const conflictingCall = existingCalls.find((call) => {
    const callStart = toDate(call.scheduledAt);
    const callEnd = new Date(callStart.getTime() + durationMinutes * 60_000);
    return rangesOverlap(start, end, callStart, callEnd);
  });
  if (conflictingCall) {
    return fail('overlap', 'This time overlaps an existing call');
  }

  return { ok: true };
}

// Pure calendar-digit arithmetic on a 'YYYY-MM-DD' string — deliberately timezone-agnostic (adds
// one to the day-of-month via Date.UTC, same UTC-safe pattern client/src/lib/planBuilder.js already
// uses for week math) so it means "the next calendar date," independent of what `timezone` is.
function nextDateString(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

// [start, end) UTC instants for one civil date in `timezone` — DST-aware (a local day can be 23
// or 25 UTC hours on a transition day), which is why this isn't `dayStart + 24h`.
export function calendarDayRange(date, timezone) {
  return {
    dayStart: fromZonedTime(`${date}T00:00:00`, timezone),
    dayEnd: fromZonedTime(`${nextDateString(date)}T00:00:00`, timezone),
  };
}

// Enumerates every bookable slot start on one calendar day. `date` is YYYY-MM-DD in
// `dateTimezone` (the viewer's zone — a Chicago Tuesday when the client is in America/Chicago).
// Each candidate is still a UTC instant; weekly hours are applied in the dietitian's `timezone`
// and exceptions/calls compare instants, so a Kolkata Wednesday block that lands on Tuesday in
// Chicago is omitted from Tuesday's list instead of showing as free. Defaults `dateTimezone` to
// `timezone` so existing dietitian-local callers stay unchanged. Returns UTC ISO strings; the
// viewer-local label is SlotPicker's job.
export function listAvailableSlots({
  workingHours = [],
  exceptions = [],
  existingCalls = [],
  date,
  durationMinutes = CALL_DURATION_MINUTES,
  timezone = 'UTC',
  dateTimezone,
}) {
  const { dayStart, dayEnd } = calendarDayRange(date, dateTimezone || timezone);
  const stepMs = durationMinutes * 60_000;

  const slots = [];
  for (let t = dayStart.getTime(); t + stepMs <= dayEnd.getTime(); t += stepMs) {
    const candidate = new Date(t);
    const result = checkAvailability({ workingHours, exceptions, existingCalls, requestedStart: candidate, durationMinutes, timezone });
    if (result.ok) slots.push(candidate.toISOString());
  }
  return slots;
}
