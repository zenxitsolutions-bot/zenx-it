import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

function mapGap(row) {
  return {
    id: row.id,
    consultationSchedule: row.consultation_schedule_id,
    occurrenceAt: row.occurrence_at,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export async function createGap(scheduleId, occurrenceAt, reason) {
  await pool.query(
    'INSERT INTO consultation_schedule_gaps (id, consultation_schedule_id, occurrence_at, reason) VALUES (?, ?, ?, ?)',
    [newId(), scheduleId, occurrenceAt, String(reason).slice(0, 255)]
  );
}

export async function listGapsBySchedule(scheduleId) {
  const [rows] = await pool.query(
    'SELECT * FROM consultation_schedule_gaps WHERE consultation_schedule_id = ? ORDER BY occurrence_at ASC',
    [scheduleId]
  );
  return rows.map(mapGap);
}

// The idempotency half that lives in the gaps table: every instant already flagged for this
// schedule, so generateForSchedule never re-flags the same date on every job run.
export async function listGapInstants(scheduleId) {
  const [rows] = await pool.query(
    'SELECT occurrence_at FROM consultation_schedule_gaps WHERE consultation_schedule_id = ?',
    [scheduleId]
  );
  return rows.map((row) => row.occurrence_at);
}

// Called by saveConsultationSchedule immediately before a regenerate — a gap is a record of "this
// pattern's generator tried this date and failed," not a permanent log; once the pattern that
// produced it is gone (a regenerate always re-derives from the schedule's current config), the old
// gap is either resolved (the new pattern doesn't land there) or will be re-flagged fresh with an
// up-to-date reason. Without this, a gap created under a stale preferredTime/preferredWeekday would
// show in "Needs attention" forever, even after the conflict it described no longer exists.
export async function deleteGapsBySchedule(scheduleId) {
  await pool.query('DELETE FROM consultation_schedule_gaps WHERE consultation_schedule_id = ?', [scheduleId]);
}
