import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

function mapConsultationSchedule(row) {
  if (!row) return null;
  return {
    id: row.id,
    client: row.client_id,
    frequencyDays: row.frequency_days,
    preferredWeekday: row.preferred_weekday,
    preferredTime: row.preferred_time,
    startDate: row.start_date,
    active: !!row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findConsultationScheduleByClientId(clientId) {
  const [rows] = await pool.query('SELECT * FROM consultation_schedules WHERE client_id = ? LIMIT 1', [clientId]);
  return mapConsultationSchedule(rows[0]);
}

export async function findConsultationScheduleById(id) {
  const [rows] = await pool.query('SELECT * FROM consultation_schedules WHERE id = ? LIMIT 1', [id]);
  return mapConsultationSchedule(rows[0]);
}

// Every schedule the rolling-window job should consider — a paused (active=false) one is excluded
// at the source rather than filtered per-schedule by every caller.
export async function listActiveSchedules() {
  const [rows] = await pool.query('SELECT * FROM consultation_schedules WHERE active = TRUE');
  return rows.map(mapConsultationSchedule);
}

// One row per client (uq_consultation_schedules_client) — insert on first save, update on every
// one after that. `ON DUPLICATE KEY UPDATE` keeps this a single round trip and preserves the row's
// own id/createdAt across edits, rather than the caller having to branch on "does one exist yet."
export async function upsertConsultationSchedule(clientId, { frequencyDays, preferredWeekday, preferredTime, startDate, active }) {
  await pool.query(
    `INSERT INTO consultation_schedules (id, client_id, frequency_days, preferred_weekday, preferred_time, start_date, active)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       frequency_days = VALUES(frequency_days),
       preferred_weekday = VALUES(preferred_weekday),
       preferred_time = VALUES(preferred_time),
       start_date = VALUES(start_date),
       active = VALUES(active)`,
    [newId(), clientId, frequencyDays, preferredWeekday, preferredTime, startDate, active]
  );
  return findConsultationScheduleByClientId(clientId);
}
