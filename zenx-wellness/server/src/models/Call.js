import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';

const CALL_COLUMNS = {
  scheduledAt: 'scheduled_at',
  status: 'status',
  notes: 'notes',
  reminderMinutesBefore: 'reminder_minutes_before',
  originalScheduledAt: 'original_scheduled_at',
  rescheduledAt: 'rescheduled_at',
  icsSequence: 'ics_sequence',
  consultationScheduleId: 'consultation_schedule_id',
  meetingUrl: 'meeting_url',
  meetingProvider: 'meeting_provider',
  googleEventId: 'google_event_id',
};

// dietitianName/clientName/enquiryName etc. are only present when the caller asked for them via
// the LEFT JOINs below — mirrors Mongoose's .populate('dietitian', 'name') /
// .populate('client', 'name'). Exactly one of client_id/enquiry_id is ever set (see
// chk_calls_client_xor_enquiry in schema.sql) — before a lead converts, a follow-up call is
// enquiry-linked and call.client is null; call.enquiry carries the same {_id, name, phone, email}
// shape a real client would, so display code can do `call.client?.name ?? call.enquiry?.name`
// without caring which one it actually got.
function mapCall(row) {
  if (!row) return null;
  const call = {
    id: row.id,
    client: row.client_id,
    enquiry: row.enquiry_id,
    dietitian: row.dietitian_id,
    scheduledAt: row.scheduled_at,
    status: row.status,
    notes: row.notes,
    reminderMinutesBefore: row.reminder_minutes_before,
    icsSequence: row.ics_sequence,
    consultationScheduleId: row.consultation_schedule_id,
    originalScheduledAt: row.original_scheduled_at,
    rescheduledAt: row.rescheduled_at,
    meetingUrl: row.meeting_url,
    meetingProvider: row.meeting_provider,
    // Google's own event id is an internal detail — it is never sent to the client (see
    // call.controller.js, which strips it), only used server-side to patch/delete the event.
    googleEventId: row.google_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.dietitian_name !== undefined) call.dietitian = { _id: row.dietitian_id, name: row.dietitian_name };
  if (row.client_name !== undefined && row.client_id) call.client = { _id: row.client_id, name: row.client_name };
  if (row.enquiry_name !== undefined && row.enquiry_id) {
    call.enquiry = { _id: row.enquiry_id, name: row.enquiry_name, phone: row.enquiry_phone, email: row.enquiry_email };
  }
  return call;
}

// filter: { companyId, client?, dietitian?, from?, to?, consultationScheduleId?, status? } —
// companyId required, scoped via the owning dietitian's own company (dietitian_id is always
// NOT NULL — see schema.sql), same transitive-scoping design used throughout.
export async function listCalls(filter = {}) {
  if (!filter.companyId) throw new Error('listCalls: companyId is required');
  const where = ['du.company_id = ?'];
  const params = [filter.companyId];
  if (filter.client) {
    where.push('c.client_id = ?');
    params.push(filter.client);
  }
  if (filter.dietitian) {
    where.push('c.dietitian_id = ?');
    params.push(filter.dietitian);
  }
  if (filter.from) {
    where.push('c.scheduled_at >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    where.push('c.scheduled_at <= ?');
    params.push(filter.to);
  }
  if (filter.consultationScheduleId) {
    where.push('c.consultation_schedule_id = ?');
    params.push(filter.consultationScheduleId);
  }
  if (filter.status) {
    where.push('c.status = ?');
    params.push(filter.status);
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT c.*, cu.name AS client_name, du.name AS dietitian_name,
       eq.name AS enquiry_name, eq.phone AS enquiry_phone, eq.email AS enquiry_email
     FROM calls c
     LEFT JOIN users cu ON cu.id = c.client_id
     JOIN users du ON du.id = c.dietitian_id
     LEFT JOIN enquiries eq ON eq.id = c.enquiry_id
     ${whereSql}
     ORDER BY c.scheduled_at ASC`,
    params
  );
  return rows.map(mapCall);
}

// conn defaults to the pool but accepts a transaction connection (see availabilityGuard.js) so a
// caller can read back a row it just inserted before that transaction commits.
export async function findCallById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT c.*, cu.name AS client_name, du.name AS dietitian_name,
       eq.name AS enquiry_name, eq.phone AS enquiry_phone, eq.email AS enquiry_email
     FROM calls c
     LEFT JOIN users cu ON cu.id = c.client_id
     JOIN users du ON du.id = c.dietitian_id
     LEFT JOIN enquiries eq ON eq.id = c.enquiry_id
     WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return mapCall(rows[0]);
}

// reminderScheduler.js's due-window query: a scheduled call whose reminder hasn't fired yet, whose
// reminder window has now opened (scheduled_at - reminder_minutes_before <= now), and which hasn't
// started yet (scheduled_at > now — a poll-interval-sized safety margin against reminding about a
// call already in progress after a slow tick). Only ids/scheduledAt/reminderMinutesBefore are
// needed for the due-check itself; the scheduler re-fetches the full call via findCallById to
// actually send.
export async function listCallsDueForReminder(now = new Date()) {
  const [rows] = await pool.query(
    `SELECT id FROM calls
     WHERE status = 'scheduled'
       AND reminder_minutes_before IS NOT NULL
       AND reminder_sent_at IS NULL
       AND scheduled_at > ?
       AND scheduled_at <= DATE_ADD(?, INTERVAL reminder_minutes_before MINUTE)`,
    [now, now]
  );
  return rows.map((r) => r.id);
}

// Set in the same tick that enqueues the reminder emails — the dedupe flag that stops a later tick
// (or a poller restart mid-batch) from sending the same reminder twice.
export async function markCallReminderSent(id) {
  await pool.query('UPDATE calls SET reminder_sent_at = NOW(3) WHERE id = ?', [id]);
}

// client XOR enquiry — enforced by the DB's CHECK constraint too, but validated here so a bad
// caller gets a clear application-level error instead of a raw SQL constraint-violation message.
export async function createCall(
  { client = null, enquiry = null, dietitian, scheduledAt, notes = null, reminderMinutesBefore = null, consultationScheduleId = null },
  conn = pool
) {
  if (Boolean(client) === Boolean(enquiry)) {
    throw new Error('createCall requires exactly one of client or enquiry');
  }
  const id = newId();
  await conn.query(
    `INSERT INTO calls
      (id, client_id, enquiry_id, dietitian_id, scheduled_at, notes, reminder_minutes_before, consultation_schedule_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, client, enquiry, dietitian, scheduledAt, notes, reminderMinutesBefore, consultationScheduleId]
  );
  return findCallById(id, conn);
}

// Re-points every enquiry-linked call onto the client account just created for that enquiry (spec
// §2026-round2-fixes item 1: "carry over ... any scheduled follow-up calls so the new client's
// call history isn't empty") — an UPDATE, not a copy, so the call's own id/history (reschedule
// tracking, notes) survives unchanged; it simply stops being enquiry-scoped and becomes
// client-scoped. Must run in the same transaction as the conversion itself.
export async function reassignEnquiryCallsToClient(enquiryId, clientId, conn) {
  await conn.query('UPDATE calls SET client_id = ?, enquiry_id = NULL WHERE enquiry_id = ?', [clientId, enquiryId]);
}

// The concurrency-safe read behind the availability guard: locks every still-`scheduled` call for
// this dietitian whose scheduled_at falls in (rangeStart, rangeEnd) so a concurrent transaction
// requesting an overlapping slot blocks here until this one commits or rolls back (InnoDB next-key
// locking on a `SELECT ... FOR UPDATE` indexed range, under the default REPEATABLE READ isolation
// — see server/src/services/availabilityGuard.js for the full explanation). Must run inside the
// same transaction as the eventual insert/update, hence the required `conn`.
export async function lockOverlappingCalls(dietitianId, rangeStart, rangeEnd, { excludeCallId } = {}, conn = pool) {
  const params = [dietitianId, rangeStart, rangeEnd];
  // USE INDEX forces the (dietitian_id, scheduled_at) composite index rather than leaving it to
  // the optimizer: on a small/lightly-populated table MySQL can otherwise pick the single-column
  // idx_calls_dietitian index instead, which next-key-locks every row for this dietitian regardless
  // of scheduled_at (verified via EXPLAIN) — real contention between unrelated, non-overlapping
  // bookings for the same dietitian, not just a missed optimization.
  let sql = `SELECT id, scheduled_at FROM calls USE INDEX (idx_calls_dietitian_scheduled)
     WHERE dietitian_id = ? AND status = 'scheduled' AND scheduled_at > ? AND scheduled_at < ?`;
  if (excludeCallId) {
    sql += ' AND id != ?';
    params.push(excludeCallId);
  }
  sql += ' FOR UPDATE';
  const [rows] = await conn.query(sql, params);
  return rows.map((row) => ({ id: row.id, scheduledAt: row.scheduled_at }));
}

// Read-only sibling of lockOverlappingCalls — no FOR UPDATE, no transaction required — for
// displaying a day's available slots (GET /calls/available-slots). This is purely informational:
// the actual booking decision still goes through assertSlotAvailable's locked read at submit time,
// so a slot shown here can still lose a race to another booking between viewing and submitting
// (surfaced as the existing 409 conflict on submit).
export async function listScheduledCallsOnDate(dietitianId, dayStart, dayEnd, { excludeCallId } = {}, conn = pool) {
  const params = [dietitianId, dayStart, dayEnd];
  let sql = `SELECT id, scheduled_at FROM calls
     WHERE dietitian_id = ? AND status = 'scheduled' AND scheduled_at >= ? AND scheduled_at < ?`;
  if (excludeCallId) {
    sql += ' AND id != ?';
    params.push(excludeCallId);
  }
  const [rows] = await conn.query(sql, params);
  return rows.map((row) => ({ id: row.id, scheduledAt: row.scheduled_at }));
}

export async function updateCallById(id, patch, conn = pool) {
  const { sets, params } = buildSetClause(CALL_COLUMNS, patch);
  if (sets.length) {
    await conn.query(`UPDATE calls SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  }
  return findCallById(id, conn);
}

// The idempotency half that lives on `calls` for a consultation schedule
// (server/src/services/consultationScheduleService.js#generateForSchedule): every instant this
// schedule has ever produced a call for, regardless of that call's current status or whether it's
// since been rescheduled elsewhere — COALESCE(original_scheduled_at, scheduled_at) is the *first*
// time the row was ever scheduled for (original_scheduled_at only gets set on the first reschedule,
// preserving that original instant forever after), so a reschedule or cancellation on one occurrence
// is never mistaken for "this date was never generated" on the next run.
export async function listOccurrenceInstants(consultationScheduleId) {
  const [rows] = await pool.query(
    'SELECT COALESCE(original_scheduled_at, scheduled_at) AS occurrence_at FROM calls WHERE consultation_schedule_id = ?',
    [consultationScheduleId]
  );
  return rows.map((row) => row.occurrence_at);
}

export async function deleteCallById(id) {
  const existing = await findCallById(id);
  if (!existing) return null;
  await pool.query('DELETE FROM calls WHERE id = ?', [id]);
  return existing;
}

// filter: { companyId, dietitian?, status?, from?, to? } — companyId required (no direct
// company_id column on calls; scoped by joining the owning dietitian's own company, same
// transitive-scoping design as the rest of this table's tenant isolation).
export async function countCalls(filter = {}) {
  if (!filter.companyId) throw new Error('countCalls: companyId is required');
  const where = ['du.company_id = ?'];
  const params = [filter.companyId];
  if (filter.dietitian) {
    where.push('c.dietitian_id = ?');
    params.push(filter.dietitian);
  }
  if (filter.status) {
    where.push('c.status = ?');
    params.push(filter.status);
  }
  if (filter.from) {
    where.push('c.scheduled_at >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    where.push('c.scheduled_at <= ?');
    params.push(filter.to);
  }
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM calls c JOIN users du ON du.id = c.dietitian_id WHERE ${where.join(' AND ')}`,
    params
  );
  return Number(rows[0].count);
}

// Today's appointments for one dietitian, with client (or enquiry, for a not-yet-converted
// follow-up) name populated — used by insights.controller.js#dietitianOverview.
export async function listCallsForDietitianInRange(dietitianId, from, to) {
  const [rows] = await pool.query(
    `SELECT c.*, cu.name AS client_name, eq.name AS enquiry_name, eq.phone AS enquiry_phone, eq.email AS enquiry_email
     FROM calls c
     LEFT JOIN users cu ON cu.id = c.client_id
     LEFT JOIN enquiries eq ON eq.id = c.enquiry_id
     WHERE c.dietitian_id = ? AND c.scheduled_at >= ? AND c.scheduled_at <= ?`,
    [dietitianId, from, to]
  );
  return rows.map(mapCall);
}
