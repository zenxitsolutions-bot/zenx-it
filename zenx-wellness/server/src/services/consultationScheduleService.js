import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { CALL_DURATION_MINUTES, checkAvailability } from './availability.js';
import { listWeeklyHours } from '../models/DietitianWeeklyHours.js';
import {
  findConsultationScheduleByClientId,
  upsertConsultationSchedule,
  listActiveSchedules,
} from '../models/ConsultationSchedule.js';
import { createGap, listGapInstants, listGapsBySchedule, deleteGapsBySchedule } from '../models/ConsultationScheduleGap.js';
import { listCalls, listOccurrenceInstants } from '../models/Call.js';
import { findUserById } from '../models/User.js';
import { bookCall, applyCallUpdate } from './callService.js';
import { notifyCallEvent } from './callNotifications.js';
import { notifyScheduleGenerated } from './consultationScheduleNotifications.js';
import { ApiError } from '../utils/ApiError.js';

// How far ahead a generation run keeps the series filled — a ROLLING window, not an infinite
// series: refreshed by re-running generateForSchedule (the recurring job, or an immediate run
// right after a save/regenerate), never computed once and left to run forever unattended.
const ROLLING_WINDOW_DAYS = 60;

function normalizeTime(value) {
  return value.length === 5 ? `${value}:00` : value;
}

// mysql2 returns a DATE column as a Date at UTC midnight; a request body carries a plain
// 'YYYY-MM-DD' string. Either way this is a pure calendar date with no time component of its own —
// extracted via UTC getters (never toZonedTime, which would wrongly treat it as an instant to
// re-zone) so it's read back as the same calendar digits regardless of the server's own clock.
function toDateString(value) {
  if (typeof value === 'string') return value.slice(0, 10);
  const pad = (n) => String(n).padStart(2, '0');
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}

// "Today," as a calendar date IN the dietitian's timezone — unlike startDate/preferredTime (already
// pure wall-clock values), `now` genuinely is a real instant, so this is the one place in this file
// a real instant-to-zoned-date conversion belongs (same toZonedTime idiom availability.js uses).
function todayInZone(timezone, now) {
  const zoned = toZonedTime(now, timezone);
  const pad = (n) => String(n).padStart(2, '0');
  return `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}-${pad(zoned.getDate())}`;
}

function addCalendarDays(dateString, days) {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function weekdayOf(dateString) {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// The first occurrence's calendar date: the next date >= max(startDate, today-in-timezone) that
// falls on `preferredWeekday`. Shared by both computeOccurrencesInWindow and
// checkWorkingHoursWarning so there's exactly one definition of "the next occurrence."
function anchorDateString({ startDate, preferredWeekday, timezone, now }) {
  const startDateString = toDateString(startDate);
  const todayString = todayInZone(timezone, now);
  let candidate = startDateString > todayString ? startDateString : todayString;
  // At most 6 steps — weekday cycles every 7 days, so a match always exists within one week.
  while (weekdayOf(candidate) !== preferredWeekday) {
    candidate = addCalendarDays(candidate, 1);
  }
  return candidate;
}

// Every occurrence instant from the anchor through `now + windowDays`. The first occurrence
// anchors to preferredWeekday; every occurrence after that is simply `+ frequencyDays` from the
// previous one — NOT re-anchored to preferredWeekday each time. For a 7/14-day frequency (a
// multiple of 7) this keeps every occurrence on the same weekday forever, which is what "every
// 7/14 days on Tuesdays" actually means. A custom, non-multiple-of-7 frequency will drift across
// weekdays over time — the mathematically honest result of "every N days" when N isn't a
// week-multiple, not a bug to mask by silently re-snapping to the weekday on every occurrence.
export function computeOccurrencesInWindow({
  startDate,
  preferredWeekday,
  preferredTime,
  frequencyDays,
  timezone,
  windowDays = ROLLING_WINDOW_DAYS,
  now = new Date(),
}) {
  const time = normalizeTime(preferredTime);
  const windowEnd = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  let candidate = anchorDateString({ startDate, preferredWeekday, timezone, now });
  const occurrences = [];
  for (;;) {
    const instant = fromZonedTime(`${candidate}T${time}`, timezone);
    if (instant > windowEnd) break;
    occurrences.push(instant);
    candidate = addCalendarDays(candidate, frequencyDays);
  }
  return occurrences;
}

// Save-time SOFT warning (never a hard block — that's what the real, per-occurrence
// assertSlotAvailable inside bookCall is for). Reuses checkAvailability directly against the very
// next occurrence: the only possible non-ok reason with no exceptions/existingCalls passed in is
// 'outside_hours', which is exactly the warning this needs — no new timezone-aware comparison
// logic written for it.
export async function checkWorkingHoursWarning({ dietitian, preferredWeekday, preferredTime }) {
  const timezone = dietitian.timezone || 'UTC';
  const workingHours = await listWeeklyHours(dietitian.id);
  const now = new Date();
  const candidate = anchorDateString({ startDate: now, preferredWeekday, timezone, now });
  const nextOccurrence = fromZonedTime(`${candidate}T${normalizeTime(preferredTime)}`, timezone);

  const result = checkAvailability({
    workingHours,
    exceptions: [],
    existingCalls: [],
    requestedStart: nextOccurrence,
    durationMinutes: CALL_DURATION_MINUTES,
    timezone,
  });
  if (result.ok || result.reason !== 'outside_hours') return { withinHours: true, message: null };
  return { withinHours: false, message: result.message };
}

// The core generator — called both by an immediate save/regenerate and by the recurring job.
// Idempotent: an occurrence instant already claimed by a call (any status — see
// Call.js#listOccurrenceInstants) or an existing gap is never re-attempted. Each new instant goes
// through the real, availability-checked bookCall(); a genuine scheduling conflict (ApiError —
// blocked/outside hours/overlap) is recorded as a gap instead of aborting the rest of the run. A
// non-ApiError failure is NOT swallowed as a gap — it propagates, so a real bug is never mistaken
// for an ordinary scheduling conflict.
export async function generateForSchedule({ schedule, client, dietitian, now = new Date() }) {
  const timezone = dietitian.timezone || 'UTC';
  const windowInstants = computeOccurrencesInWindow({
    startDate: schedule.startDate,
    preferredWeekday: schedule.preferredWeekday,
    preferredTime: schedule.preferredTime,
    frequencyDays: schedule.frequencyDays,
    timezone,
    now,
  });

  const [claimedByCalls, claimedByGaps] = await Promise.all([
    listOccurrenceInstants(schedule.id),
    listGapInstants(schedule.id),
  ]);
  const claimed = new Set([...claimedByCalls, ...claimedByGaps].map((d) => new Date(d).getTime()));
  const newInstants = windowInstants.filter((instant) => !claimed.has(instant.getTime()));

  const createdCalls = [];
  const newGaps = [];
  for (const scheduledAt of newInstants) {
    try {
      const call = await bookCall({
        client: client.id,
        dietitian: dietitian.id,
        scheduledAt,
        notes: 'Recurring consultation',
        consultationScheduleId: schedule.id,
        skipNotification: true,
      });
      createdCalls.push(call);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      await createGap(schedule.id, scheduledAt, err.message);
      newGaps.push({ scheduledAt, reason: err.message });
    }
  }

  // Notification batching: a lone new call (the normal steady-state top-up as the window rolls
  // forward) gets the usual per-call booking email; more than one (the initial fill, or right
  // after a regenerate) gets a single summary instead of a burst — see
  // consultationScheduleNotifications.js.
  if (createdCalls.length === 1) {
    await notifyCallEvent('booked', createdCalls[0]);
  } else if (createdCalls.length > 1) {
    await notifyScheduleGenerated({ schedule, client, dietitian, createdCalls, newGaps });
  }

  return { createdCalls, newGaps };
}

// Cancels every still-scheduled, still-future call this schedule already produced, through the
// real cancellation path (applyCallUpdate) — a genuine cancellation, so the cancellation
// email/.ics fires for each one. Also DETACHES each one from the schedule (consultationScheduleId:
// null): this is what lets a regenerate actually refill a date the new pattern lands back on —
// without detaching, that instant would stay "claimed" forever by the now-cancelled row and
// generateForSchedule would permanently skip it. This is deliberately different from an
// individual, user-initiated cancel/reschedule via the normal call PATCH path, which never detaches
// (call.schema.js's updateCallSchema has no consultationScheduleId field at all) — an individual
// action on one occurrence must keep blocking that date forever, exactly per the "must not be
// undone by the next generation run" requirement; only a whole-series regenerate frees the dates
// back up.
export async function cancelFutureGeneratedCalls(scheduleId, companyId) {
  const calls = await listCalls({ companyId, consultationScheduleId: scheduleId, status: 'scheduled', from: new Date() });
  const cancelled = [];
  for (const call of calls) {
    cancelled.push(await applyCallUpdate(call.id, call, { status: 'cancelled', consultationScheduleId: null }));
  }
  return cancelled;
}

// The one orchestrating entry point behind PUT /consultation-schedule.
//
// - No dietitian assigned to the client yet: saves the config only — no warning (nothing to
//   validate against), no generation. A later save, once a dietitian exists, picks up from there.
// - `regenerateFutureCalls` (or this being the schedule's very first save): cancels+detaches
//   whatever future calls this schedule already produced, then — unless the schedule is paused —
//   refills the rolling window from the (possibly just-changed) pattern.
// - Otherwise: only the stored config changes. Already-booked future calls are left completely
//   alone — the explicit "ask, never silently rewrite or orphan" behavior this was built for.
export async function saveConsultationSchedule({
  clientId,
  frequencyDays,
  preferredWeekday,
  preferredTime,
  startDate,
  active,
  regenerateFutureCalls = false,
}) {
  const existing = await findConsultationScheduleByClientId(clientId);
  const isFirstSave = !existing;

  const schedule = await upsertConsultationSchedule(clientId, {
    frequencyDays,
    preferredWeekday,
    preferredTime: normalizeTime(preferredTime),
    startDate,
    active,
  });

  const client = await findUserById(clientId);
  if (!client.assignedDietitian) {
    return { schedule, dietitianAssigned: false, warning: null, generated: [], gaps: [], cancelled: [] };
  }

  const dietitian = await findUserById(client.assignedDietitian);
  const { withinHours, message } = await checkWorkingHoursWarning({
    dietitian,
    preferredWeekday: schedule.preferredWeekday,
    preferredTime: schedule.preferredTime,
  });

  let generated = [];
  let gaps = [];
  let cancelled = [];

  if (isFirstSave || regenerateFutureCalls) {
    cancelled = await cancelFutureGeneratedCalls(schedule.id, client.companyId);
    // Clear old gap rows too — they describe conflicts under whatever pattern was active when they
    // were recorded, which a regenerate has just superseded (see the column comment on
    // deleteGapsBySchedule). generateForSchedule below re-flags anything that's still genuinely
    // unresolvable under the new pattern.
    await deleteGapsBySchedule(schedule.id);
    if (active) {
      ({ createdCalls: generated, newGaps: gaps } = await generateForSchedule({ schedule, client, dietitian }));
    }
  }

  return { schedule, dietitianAssigned: true, warning: withinHours ? null : message, generated, gaps, cancelled };
}

// The recurring job's entry point (server/src/services/consultationScheduleJob.js): tops up every
// active schedule's rolling window. One schedule's failure is caught and logged, never aborting
// the rest of the run — same per-item isolation principle as the email worker's own drainOnce().
export async function runConsultationScheduleGenerationJob() {
  const schedules = await listActiveSchedules();
  for (const schedule of schedules) {
    try {
      const client = await findUserById(schedule.client);
      if (!client?.assignedDietitian) continue;
      const dietitian = await findUserById(client.assignedDietitian);
      await generateForSchedule({ schedule, client, dietitian });
    } catch (err) {
      console.error(`[consultation-schedule-job] failed to generate for schedule ${schedule.id}:`, err);
    }
  }
  return schedules.length;
}

// Admin-view helper: the durable "couldn't be placed" record for one schedule.
export async function getScheduleGaps(scheduleId) {
  return listGapsBySchedule(scheduleId);
}
