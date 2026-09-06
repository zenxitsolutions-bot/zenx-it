import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

function mapHistoryEntry(row) {
  if (!row) return null;
  return {
    id: row.id,
    enquiry: row.enquiry_id,
    status: row.status,
    note: row.note,
    call: row.call_id,
    createdAt: row.created_at,
  };
}

export async function listByEnquiryId(enquiryId, conn = pool) {
  const [rows] = await conn.query(
    'SELECT * FROM enquiry_history WHERE enquiry_id = ? ORDER BY created_at ASC',
    [enquiryId]
  );
  return rows.map(mapHistoryEntry);
}

// Append-only — no update/delete function exists, by design (nothing overwrites history).
export async function createHistoryEntry({ enquiryId, status, note = null, callId = null }, conn = pool) {
  const id = newId();
  await conn.query(
    'INSERT INTO enquiry_history (id, enquiry_id, status, note, call_id) VALUES (?, ?, ?, ?, ?)',
    [id, enquiryId, status, note, callId]
  );
  const [rows] = await conn.query('SELECT * FROM enquiry_history WHERE id = ? LIMIT 1', [id]);
  return mapHistoryEntry(rows[0]);
}
