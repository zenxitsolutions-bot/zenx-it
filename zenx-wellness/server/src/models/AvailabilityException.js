import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

function mapException(row) {
  return {
    id: row.id,
    dietitian: row.dietitian_id,
    startAt: row.start_at,
    endAt: row.end_at,
    kind: row.kind,
    note: row.note,
    createdAt: row.created_at,
  };
}

// filter: { from?, to? } — for the management screen's list view (upcoming exceptions by default).
export async function listExceptions(dietitianId, filter = {}, conn = pool) {
  const where = ['dietitian_id = ?'];
  const params = [dietitianId];
  if (filter.from) {
    where.push('end_at >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    where.push('start_at <= ?');
    params.push(filter.to);
  }
  const [rows] = await conn.query(
    `SELECT * FROM dietitian_availability_exceptions WHERE ${where.join(' AND ')} ORDER BY start_at ASC`,
    params
  );
  return rows.map(mapException);
}

// Every exception whose range could possibly matter to a slot in [start, end) — used by the
// availability guard, so it must run on the same connection/transaction as the booking check.
export async function listExceptionsOverlapping(dietitianId, start, end, conn = pool) {
  const [rows] = await conn.query(
    'SELECT * FROM dietitian_availability_exceptions WHERE dietitian_id = ? AND start_at < ? AND end_at > ? ORDER BY start_at ASC',
    [dietitianId, end, start]
  );
  return rows.map(mapException);
}

export async function createException({ dietitianId, startAt, endAt, kind, note = null }, conn = pool) {
  const id = newId();
  await conn.query(
    'INSERT INTO dietitian_availability_exceptions (id, dietitian_id, start_at, end_at, kind, note) VALUES (?, ?, ?, ?, ?, ?)',
    [id, dietitianId, startAt, endAt, kind, note]
  );
  const [rows] = await conn.query('SELECT * FROM dietitian_availability_exceptions WHERE id = ? LIMIT 1', [id]);
  return mapException(rows[0]);
}

// Scoped to dietitianId — self-service only, a dietitian can never delete another's exception.
export async function deleteExceptionById(id, dietitianId, conn = pool) {
  const [rows] = await conn.query(
    'SELECT * FROM dietitian_availability_exceptions WHERE id = ? AND dietitian_id = ? LIMIT 1',
    [id, dietitianId]
  );
  const existing = rows[0] ? mapException(rows[0]) : null;
  if (!existing) return null;
  await conn.query('DELETE FROM dietitian_availability_exceptions WHERE id = ?', [id]);
  return existing;
}
