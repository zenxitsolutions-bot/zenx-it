import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

// program_plan_name is only present when the caller asked for it via the LEFT JOIN below (mirrors
// Call.js's dietitian_name/client_name populate pattern).
function mapUser(row) {
  if (!row) return null;
  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    phone: row.phone,
    address: row.address,
    qualifications: row.qualifications,
    accountStatus: row.account_status,
    assignedDietitian: row.assigned_dietitian_id,
    refreshTokenVersion: row.refresh_token_version,
    mustChangePassword: !!row.must_change_password,
    programPlan: row.program_plan_id,
    planDuration: row.plan_duration,
    timezone: row.timezone,
    country: row.country,
    dateFormat: row.date_format,
    timeFormat: row.time_format,
    zenxUserId: row.zenx_user_id,
    companyId: row.company_id,
    companySlug: row.company_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.program_plan_name !== undefined && row.program_plan_id) {
    user.programPlan = { _id: row.program_plan_id, name: row.program_plan_name };
  }
  return user;
}

const SELECT_WITH_PROGRAM_PLAN = `SELECT u.*, pp.name AS program_plan_name FROM users u
   LEFT JOIN program_plans pp ON pp.id = u.program_plan_id`;

export async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  // LOWER() so a stored mixed-case address still matches what loginSchema normalizes to.
  const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [normalized]);
  return mapUser(rows[0]);
}

// See the zenx_user_id comment in schema.sql — checked before email by the SSO handoff (never the
// other way around) so a ZenX-side email change can't orphan an already-linked local account.
export async function findUserByZenxId(zenxUserId) {
  const [rows] = await pool.query('SELECT * FROM users WHERE zenx_user_id = ? LIMIT 1', [zenxUserId]);
  return mapUser(rows[0]);
}

// conn defaults to the pool but accepts a transaction connection (see
// availabilityGuard.js#getDietitianTimezone) so a caller already inside a transaction reads a
// consistent snapshot instead of opening a second, unrelated pool connection.
export async function findUserById(id, conn = pool) {
  const [rows] = await conn.query(`${SELECT_WITH_PROGRAM_PLAN} WHERE u.id = ? LIMIT 1`, [id]);
  return mapUser(rows[0]);
}

export async function createUser(
  {
    name,
    email,
    passwordHash,
    role,
    phone = null,
    address = null,
    qualifications = null,
    assignedDietitian = null,
    mustChangePassword = false,
    programPlan = null,
    planDuration = null,
    // Optional — left unset relies on the column's own DB default ('UTC'), same as before this
    // field existed on createUserSchema at all.
    timezone,
    zenxUserId = null,
    companyId,
    companySlug = null,
  },
  conn = pool
) {
  if (!companyId) throw new Error('createUser: companyId is required');
  const id = newId();
  const columns = ['id', 'name', 'email', 'password_hash', 'role', 'phone', 'address', 'qualifications', 'assigned_dietitian_id', 'must_change_password', 'program_plan_id', 'plan_duration', 'zenx_user_id', 'company_id', 'company_slug'];
  const values = [id, name, email, passwordHash, role, phone, address, qualifications, assignedDietitian, mustChangePassword, programPlan, planDuration, zenxUserId, companyId, companySlug];
  if (timezone !== undefined) {
    columns.push('timezone');
    values.push(timezone);
  }
  await conn.query(
    `INSERT INTO users (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    values
  );
  return findUserById(id, conn);
}

// Kept separate from updateUser (client-facing allowlist) — only auth.controller.js#handoff calls
// this, to link an existing email-matched account to its ZenX identity on first SSO login.
// Deliberately never touches company_id/company_slug — see the call site's comment.
export async function linkZenxUser(id, zenxUserId) {
  await pool.query('UPDATE users SET zenx_user_id = ? WHERE id = ?', [zenxUserId, id]);
  return findUserById(id);
}

// filter: { companyId, role?, assignedDietitian? } — companyId is required so every call site has
// to consciously pass req.user.companyId; there is no "list everyone" mode left (see the removed
// global-admin listUsers call in user.controller.js).
export async function listUsers(filter = {}) {
  if (!filter.companyId) throw new Error('listUsers: companyId is required');
  const where = ['u.company_id = ?'];
  const params = [filter.companyId];
  if (filter.role) {
    where.push('u.role = ?');
    params.push(filter.role);
  }
  if (filter.assignedDietitian !== undefined) {
    where.push('u.assigned_dietitian_id = ?');
    params.push(filter.assignedDietitian);
  }
  const sql = `${SELECT_WITH_PROGRAM_PLAN} WHERE ${where.join(' AND ')}`;
  const [rows] = await pool.query(sql, params);
  return rows.map(mapUser);
}

// patch may include: name, email, phone, address, qualifications, accountStatus, role,
// assignedDietitian, programPlan, planDuration, timezone
export async function updateUser(id, patch, conn = pool) {
  const columns = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    address: 'address',
    qualifications: 'qualifications',
    accountStatus: 'account_status',
    role: 'role',
    assignedDietitian: 'assigned_dietitian_id',
    programPlan: 'program_plan_id',
    planDuration: 'plan_duration',
    timezone: 'timezone',
    country: 'country',
    dateFormat: 'date_format',
    timeFormat: 'time_format',
  };
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(columns)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = ?`);
      params.push(patch[key]);
    }
  }
  if (sets.length) {
    params.push(id);
    await conn.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return findUserById(id, conn);
}

// Kept separate from updateUser: that function's patch is driven by a client-facing allowlist
// (PATCH /users/:id, PATCH /users/me) that must never accept a raw password hash.
export async function setPassword(id, { passwordHash, mustChangePassword }) {
  await pool.query('UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?', [
    passwordHash,
    mustChangePassword,
    id,
  ]);
  return findUserById(id);
}

// Invalidates every refresh token issued before the call (see utils/jwt.js#verifyRefreshToken /
// auth.controller.js#refresh, which reject a token whose tokenVersion doesn't match this column).
export async function bumpRefreshTokenVersion(id) {
  await pool.query('UPDATE users SET refresh_token_version = refresh_token_version + 1 WHERE id = ?', [id]);
}

// Login-time backfill when a user row predates company_slug (or conversion forgot to stamp it).
// Not on the client-facing updateUser allowlist — callers must never be able to move themselves.
export async function setCompanySlug(id, companySlug) {
  await pool.query('UPDATE users SET company_slug = ? WHERE id = ?', [companySlug, id]);
  return findUserById(id);
}

export async function countUsers(filter = {}) {
  if (!filter.companyId) throw new Error('countUsers: companyId is required');
  const where = ['company_id = ?'];
  const params = [filter.companyId];
  if (filter.role) {
    where.push('role = ?');
    params.push(filter.role);
  }
  if (filter.assignedDietitian !== undefined) {
    where.push('assigned_dietitian_id = ?');
    params.push(filter.assignedDietitian);
  }
  const sql = `SELECT COUNT(*) AS count FROM users WHERE ${where.join(' AND ')}`;
  const [rows] = await pool.query(sql, params);
  return Number(rows[0].count);
}

// [{ dietitianId, clients }] — one row per dietitian (within companyId) that has at least one
// assigned client.
export async function countUsersGroupedByDietitian(companyId) {
  if (!companyId) throw new Error('countUsersGroupedByDietitian: companyId is required');
  const [rows] = await pool.query(
    "SELECT assigned_dietitian_id AS dietitianId, COUNT(*) AS clients FROM users WHERE role = 'client' AND assigned_dietitian_id IS NOT NULL AND company_id = ? GROUP BY assigned_dietitian_id",
    [companyId]
  );
  return rows.map((r) => ({ dietitianId: r.dietitianId, clients: Number(r.clients) }));
}

// How many of a dietitian's clients were created in [from, to) — paired with the total count to
// derive a real growth figure for the overview's stat cards, rather than storing a snapshot.
export async function countClientsCreatedBetween(dietitianId, from, to) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'client' AND assigned_dietitian_id = ? AND created_at >= ? AND created_at < ?",
    [dietitianId, from, to]
  );
  return Number(rows[0].count);
}

export async function listClientIdsByDietitian(dietitianId) {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE role = 'client' AND assigned_dietitian_id = ?",
    [dietitianId]
  );
  return rows.map((r) => r.id);
}

export async function touchLastLogin(id) {
  // Same UTC write as admin-server's touchUserLastLogin — CURRENT_TIMESTAMP would store the
  // session-local clock, which this pool then reads back as UTC and displays five hours early.
  await pool.query('UPDATE users SET last_login = ? WHERE id = ?', [new Date(), id]);
}
