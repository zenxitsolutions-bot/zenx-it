import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';
import { wallClockToUtc } from '../services/timezoneService.js';

export async function createFollowup(input) {
  const id = newId();
  const scheduledAtUtc = wallClockToUtc(input.scheduledDate, input.scheduledTime, input.timezone);
  await pool.query(
    `INSERT INTO followups (id, enquiry_id, assigned_to, scheduled_date, scheduled_time, scheduled_at_utc, timezone, contact_method, notes, reminder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.enquiryId,
      input.assignedTo ?? null,
      input.scheduledDate,
      input.scheduledTime,
      scheduledAtUtc,
      input.timezone,
      input.contactMethod,
      input.notes ?? null,
      input.reminder ?? 'None',
    ]
  );
  return findFollowupById(id);
}

export async function findFollowupById(id, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM followups WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

// reminderScheduler.js's candidate pool for the "N minutes before" reminder — narrowed to future,
// still-scheduled, not-yet-reminded rows only; the actual due-window check (which differs per row
// since `reminder` is a display label, not a stored minute count) happens in JS via isReminderDue.
export async function listFollowupsPendingReminder() {
  const [rows] = await pool.query(
    `SELECT * FROM followups WHERE status = 'SCHEDULED' AND reminder != 'None' AND reminder_sent_at IS NULL AND scheduled_at_utc > NOW(3)`
  );
  return rows;
}

// reminderScheduler.js's overdue sweep — dedupes naturally via the status transition itself (once
// marked OVERDUE it no longer matches status = 'SCHEDULED', so a row can never be flagged twice).
export async function listOverdueFollowups() {
  const [rows] = await pool.query(`SELECT * FROM followups WHERE status = 'SCHEDULED' AND scheduled_at_utc < NOW(3)`);
  return rows;
}

export async function markFollowupReminderSent(id) {
  await pool.query('UPDATE followups SET reminder_sent_at = NOW(3) WHERE id = ?', [id]);
}

export async function markFollowupOverdue(id) {
  await pool.query("UPDATE followups SET status = 'OVERDUE' WHERE id = ?", [id]);
}

// True chronological order (was `scheduled_date, scheduled_time` — wall-clock-lexicographic, which
// was already almost always correct for same-zone data but becomes wrong once cross-zone rows
// exist). Intentional correctness fix, not a regression.
export async function listFollowups() {
  const [rows] = await pool.query('SELECT * FROM followups ORDER BY scheduled_at_utc');
  return rows;
}

export async function listFollowupsForEnquiry(enquiryId) {
  const [rows] = await pool.query('SELECT * FROM followups WHERE enquiry_id = ? ORDER BY scheduled_at_utc', [enquiryId]);
  return rows;
}

// Covers complete/reschedule/cancel/patch — services/followups.ts's write operations all reduce to
// "update some subset of these columns." Whenever scheduledDate/scheduledTime/timezone change
// (even just one of the three), scheduled_at_utc is recomputed from the FULL resulting wall-clock —
// reading back whichever of the three fields the patch didn't include, so a partial patch (e.g.
// rescheduling just the time) never leaves scheduled_at_utc stale or wrongly derived from a mix of
// old and new values.
export async function updateFollowup(id, patch) {
  const { sets, params } = buildSetClause(
    {
      scheduledDate: 'scheduled_date',
      scheduledTime: 'scheduled_time',
      timezone: 'timezone',
      contactMethod: 'contact_method',
      notes: 'notes',
      reminder: 'reminder',
      status: 'status',
      completedAt: 'completed_at',
    },
    patch
  );

  const touchesSchedule = patch.scheduledDate !== undefined || patch.scheduledTime !== undefined || patch.timezone !== undefined;
  if (touchesSchedule) {
    const existing = await findFollowupById(id);
    if (!existing) return null;
    const scheduledDate = patch.scheduledDate ?? existing.scheduled_date;
    const scheduledTime = patch.scheduledTime ?? existing.scheduled_time;
    const timezone = patch.timezone ?? existing.timezone;
    sets.push('scheduled_at_utc = ?');
    params.push(wallClockToUtc(scheduledDate, scheduledTime, timezone));
  }

  if (sets.length) {
    params.push(id);
    await pool.query(`UPDATE followups SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return findFollowupById(id);
}
