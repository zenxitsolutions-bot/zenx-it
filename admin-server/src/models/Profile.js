import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';

// profiles = ZenX staff (Super Admin/Admin/Sales/Support). Field names are kept snake_case
// end-to-end (DB column → JSON response) so the frontend's existing `Profile` type in
// domain.ts needs no changes — see admin-server's plan decision on this.

export async function createProfile({ firstName, lastName, email, passwordHash, role, status = 'ACTIVE' }, conn = pool) {
  const id = newId();
  await conn.query(
    'INSERT INTO profiles (id, first_name, last_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, firstName, lastName, email, passwordHash, role, status]
  );
  return findProfileById(id, conn);
}

export async function findProfileById(id, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM profiles WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function findProfileByEmail(email, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM profiles WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

export async function listProfiles() {
  const [rows] = await pool.query('SELECT * FROM profiles ORDER BY first_name');
  return rows;
}

export async function updateProfile(id, patch) {
  const { sets, params } = buildSetClause(
    { role: 'role', status: 'status', timezone: 'timezone', country: 'country', date_format: 'date_format', time_format: 'time_format' },
    patch
  );
  if (sets.length) {
    await pool.query(`UPDATE profiles SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  }
  return findProfileById(id);
}

export async function updateProfilePassword(id, passwordHash, conn = pool) {
  await conn.query('UPDATE profiles SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}
