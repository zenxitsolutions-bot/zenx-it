import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';

function mapEnquiry(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    goal: row.goal,
    name: row.name,
    email: row.email,
    phone: row.phone,
    preferredSlot: row.preferred_slot,
    note: row.note,
    status: row.status,
    convertedUserId: row.converted_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createEnquiry({ companyId, goal, name, email, phone, preferredSlot = null, note = null }) {
  if (!companyId) throw new Error('createEnquiry: companyId is required');
  const id = newId();
  await pool.query(
    'INSERT INTO enquiries (id, company_id, goal, name, email, phone, preferred_slot, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, companyId, goal, name, email, phone, preferredSlot, note]
  );
  return findEnquiryById(id);
}

// filter: { companyId, status? } — companyId required, same reasoning as User.js#listUsers.
export async function listEnquiries(filter = {}, { skip = 0, limit = 20 } = {}) {
  if (!filter.companyId) throw new Error('listEnquiries: companyId is required');
  const where = ['company_id = ?'];
  const params = [filter.companyId];
  if (filter.status) {
    where.push('status = ?');
    params.push(filter.status);
  }
  const [rows] = await pool.query(
    `SELECT * FROM enquiries WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, skip]
  );
  return rows.map(mapEnquiry);
}

export async function countEnquiries(filter = {}) {
  if (!filter.companyId) throw new Error('countEnquiries: companyId is required');
  const where = ['company_id = ?'];
  const params = [filter.companyId];
  if (filter.status) {
    where.push('status = ?');
    params.push(filter.status);
  }
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM enquiries WHERE ${where.join(' AND ')}`, params);
  return Number(rows[0].count);
}

export async function findEnquiryById(id, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM enquiries WHERE id = ? LIMIT 1', [id]);
  return mapEnquiry(rows[0]);
}

// conn: pass the caller's own transaction connection when the update is part of a larger atomic
// operation (e.g. enquiry.controller.js's Converted transition) — see User.js#createUser's own
// conn comment for why reading back needs the same connection.
export async function updateEnquiryById(id, patch, conn = pool) {
  const { sets, params } = buildSetClause(
    { status: 'status', note: 'note', convertedUserId: 'converted_user_id' },
    patch
  );
  if (sets.length) {
    await conn.query(`UPDATE enquiries SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  }
  return findEnquiryById(id, conn);
}

export async function deleteEnquiryById(id) {
  const existing = await findEnquiryById(id);
  if (!existing) return null;
  await pool.query('DELETE FROM enquiries WHERE id = ?', [id]);
  return existing;
}

export async function countEnquiriesByStatus(companyId) {
  if (!companyId) throw new Error('countEnquiriesByStatus: companyId is required');
  const [rows] = await pool.query('SELECT status, COUNT(*) AS count FROM enquiries WHERE company_id = ? GROUP BY status', [companyId]);
  return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
}

// Raw created_at timestamps for a window — bucketed into weeks in JS by the caller
// (insights.controller.js reuses its existing UTC-safe startOfWeek() helper).
export async function listEnquiryCreatedAtSince(companyId, date) {
  if (!companyId) throw new Error('listEnquiryCreatedAtSince: companyId is required');
  const [rows] = await pool.query('SELECT created_at FROM enquiries WHERE company_id = ? AND created_at >= ?', [companyId, date]);
  return rows.map((r) => r.created_at);
}
