import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

// The customer identity (a company's contact person) — table is literally named `users`, matching
// the original schema; the file is named ZenxUser.js (matching the frontend's `ZenxUser` type in
// domain.ts) purely to avoid a same-named-but-different-meaning collision with wellness-app's own
// User.js in a developer's head, not because of any real DB naming conflict (separate database).

export async function createUser(input, conn = pool) {
  const id = newId();
  await conn.query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, job_title, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.email, input.passwordHash, input.firstName, input.lastName, input.phone ?? null, input.jobTitle ?? null, input.mustChangePassword ?? true]
  );
  return findUserById(id, conn);
}

function mapUser(row) {
  if (!row) return null;
  return { ...row, must_change_password: Boolean(row.must_change_password) };
}

export async function findUserById(id, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return mapUser(rows[0]);
}

export async function findUserByEmail(email, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return mapUser(rows[0]);
}

export async function listUsersByIds(ids) {
  if (!ids.length) return [];
  const [rows] = await pool.query(`SELECT * FROM users WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  return rows.map(mapUser);
}

export async function updateUserPassword(id, passwordHash, mustChangePassword) {
  await pool.query('UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?', [passwordHash, mustChangePassword, id]);
  return findUserById(id);
}

export async function markUserPasswordChanged(id) {
  await pool.query('UPDATE users SET must_change_password = FALSE WHERE id = ?', [id]);
  return findUserById(id);
}

export async function touchUserLastLogin(id) {
  await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP(3) WHERE id = ?', [id]);
}
