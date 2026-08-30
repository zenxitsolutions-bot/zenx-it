// Impure orchestrator around the pure server/src/services/availability.js check: fetches a
// dietitian's real weekly-hours template, real overlapping exceptions, and — critically — takes a
// row lock over any existing call that could overlap the requested slot, all on the caller's
// transaction connection, then runs the pure check against that snapshot.
//
// Why the lock matters (the concurrent-booking race): two requests for the same/overlapping slot
// could otherwise both run a plain SELECT, both see "no conflict," and both INSERT — a classic
// phantom-read race. `Call.js#lockOverlappingCalls` runs `SELECT ... FOR UPDATE` over an indexed
// range on `scheduled_at` for this dietitian; under InnoDB's default REPEATABLE READ isolation,
// that range query takes next-key/gap locks across the whole queried range, so a second concurrent
// transaction requesting an overlapping slot blocks on that same query until the first transaction
// commits (frees the slot as taken) or rolls back (frees it as still open). This only works because
// the caller (call.controller.js) wraps the whole check-then-insert sequence in one
// `withTransaction(...)` and passes that same `conn` through here.
import { fromZonedTime } from 'date-fns-tz';
import { CALL_DURATION_MINUTES, checkAvailability, listAvailableSlots } from './availability.js';
import { listWeeklyHours } from '../models/DietitianWeeklyHours.js';
import { listExceptionsOverlapping } from '../models/AvailabilityException.js';
import { lockOverlappingCalls, listScheduledCallsOnDate } from '../models/Call.js';
import { findUserById } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { pool } from '../db/pool.js';

// Every entry point below fetches the dietitian's own `timezone` and threads it into
// checkAvailability/listAvailableSlots — see availability.js's module comment for the rule this
// enforces (workingHours are wall-clock in that zone; everything else is a real UTC instant).
// Defaults to 'UTC' the same way the column itself does, so a dietitian who never set one keeps
// exactly the pre-timezone behavior.
async function getDietitianTimezone(dietitianId, conn) {
  const dietitian = await findUserById(dietitianId, conn);
  return dietitian?.timezone || 'UTC';
}

// Must be called with the transaction connection that will also perform the insert/update — see
// the module comment above for why.
export async function assertSlotAvailable({ dietitianId, scheduledAt, excludeCallId }, conn) {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + CALL_DURATION_MINUTES * 60_000);
  // Any existing call that could overlap [start, end) must itself start within
  // (start - duration, start + duration) — that's the range we both fetch and lock.
  const rangeStart = new Date(start.getTime() - CALL_DURATION_MINUTES * 60_000);
  const rangeEnd = new Date(start.getTime() + CALL_DURATION_MINUTES * 60_000);

  // Sequential, not Promise.all: these queries share one connection (it must be the transaction's
  // own connection, see above), and every other multi-query model in this codebase (e.g. Plan.js)
  // runs a connection's queries one at a time rather than concurrently.
  const timezone = await getDietitianTimezone(dietitianId, conn);
  const workingHours = await listWeeklyHours(dietitianId, conn);
  const exceptions = await listExceptionsOverlapping(dietitianId, start, end, conn);
  const existingCalls = await lockOverlappingCalls(dietitianId, rangeStart, rangeEnd, { excludeCallId }, conn);

  const result = checkAvailability({
    workingHours,
    exceptions,
    existingCalls,
    requestedStart: start,
    durationMinutes: CALL_DURATION_MINUTES,
    timezone,
  });

  if (!result.ok) throw ApiError.conflict(result.message);
}

// Read-only display query behind GET /calls/available-slots — no lock, no transaction (see the
// module comment on Call.js#listScheduledCallsOnDate for why that's fine here). date: 'YYYY-MM-DD',
// the dietitian's local calendar date (see availability.js#listAvailableSlots).
export async function getAvailableSlotsForDay({ dietitianId, date, excludeCallId }, conn = pool) {
  const timezone = await getDietitianTimezone(dietitianId, conn);
  const dayStart = fromZonedTime(`${date}T00:00:00`, timezone);
  const dayEnd = fromZonedTime(`${date}T23:59:59.999`, timezone);
  // Widen the fetch by one slot-duration on each side so a call that starts just before the
  // dietitian's local midnight (and so overlaps this day's first candidate slot) or just after
  // their local day ends isn't missed — listAvailableSlots's per-candidate overlap check still
  // only counts a call that actually overlaps a given candidate, so the extra rows are harmless.
  const fetchStart = new Date(dayStart.getTime() - CALL_DURATION_MINUTES * 60_000);
  const fetchEnd = new Date(dayEnd.getTime() + CALL_DURATION_MINUTES * 60_000);

  const workingHours = await listWeeklyHours(dietitianId, conn);
  const exceptions = await listExceptionsOverlapping(dietitianId, dayStart, dayEnd, conn);
  const existingCalls = await listScheduledCallsOnDate(dietitianId, fetchStart, fetchEnd, { excludeCallId }, conn);

  return listAvailableSlots({ workingHours, exceptions, existingCalls, date, durationMinutes: CALL_DURATION_MINUTES, timezone });
}
