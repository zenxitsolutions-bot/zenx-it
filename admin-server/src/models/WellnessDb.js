import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { newId } from '../db/id.js';
import { hashPassword } from '../utils/password.js';

// Direct connection to wellness-app's own "nourishly" MySQL database (see env.js#wellnessMysqlUrl).
// Lets provisionCustomerAccount create the zenx-dietitian grant's user there eagerly, instead of
// only ever via that app's own SSO handoff (wellness-app/server/src/controllers/
// auth.controller.js#handoff) on first login. Same `timezone: 'Z'` convention as every other pool
// in this codebase — see admin-server/src/db/pool.js's own comment.
const pool = env.wellnessMysqlUrl ? mysql.createPool({ uri: env.wellnessMysqlUrl, timezone: 'Z' }) : null;

// Keep identity linking, credentials, ownership and its audit record in one transaction. A
// supplied connection is already owned by its caller; this also supports isolated model tests.
async function withWellnessTransaction(database, callback) {
  if (!database) return null;
  if (typeof database.getConnection !== 'function') return callback(database);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const conn = await database.getConnection();
    try {
      await conn.beginTransaction();
      const result = await callback(conn);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      if (!['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT', 'ER_DUP_ENTRY'].includes(error.code) || attempt === 2) throw error;
    } finally { conn.release(); }
  }
}

function identityConflict() {
  const error = new Error('The Wellness identity belongs to a different account or company');
  error.code = 'ERR_WELLNESS_IDENTITY_CONFLICT';
  return error;
}

async function lockCompanyAccess(conn, companyId) {
  const [rows] = await conn.query('SELECT main_admin_user_id FROM company_access_control WHERE company_id = ? FOR UPDATE', [companyId]);
  return rows[0] ?? null;
}

async function initializeTrustedOwner(conn, input, company, user, control) {
  // The caller supplies an owner ID read from ZenX's company record, never a browser flag.
  // Slug reuse does not establish that a recreated ZenX company owns historical Wellness data.
  if (!input.mainAdminUserId || input.mainAdminUserId !== input.zenxUserId
    || input.zenxRole !== 'wellness_admin' || input.companyStatus !== 'ACTIVE'
    || company.id !== input.companyId || company.status !== 'ACTIVE'
    || user.company_id !== company.id || user.zenx_user_id !== input.zenxUserId
    || user.role !== 'admin' || user.account_status !== 'active' || control) return false;
  await conn.query('INSERT INTO company_access_control (company_id, main_admin_user_id) VALUES (?, ?)', [company.id, user.id]);
  await conn.query('INSERT INTO permission_audit (id, company_id, actor_id, target_id, action, details_json) VALUES (?, ?, NULL, ?, ?, ?)',
    [newId(), company.id, user.id, 'main_admin_initialized', JSON.stringify({ source: 'zenx_provisioning', zenxUserId: input.zenxUserId })]);
  return true;
}

async function writeWellnessCredential(conn, row, passwordHash, mustChangePassword) {
  if (row.password_hash !== passwordHash) {
    await conn.query('UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND used_at IS NULL', [row.id]);
  }
  await conn.query('UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?',
    [passwordHash, Boolean(mustChangePassword), row.id]);
  return row.id;
}

// wellness-app's own auth.controller.js#handoff maps its per-application `role` claim the same
// way: 'wellness_admin' becomes the local `admin` role, anything else falls back to `dietitian`.
// Mirrored here so an eagerly-created row and a lazily-SSO'd one always end up with the same role.
function toWellnessRole(zenxRole) {
  return zenxRole === 'wellness_admin' ? 'admin' : 'dietitian';
}

// Mirrors wellness-app's own models/Company.js#upsertCompanyFromHandoff — kept as a second copy
// (not a shared package) since the two apps are deliberately independent deployments that just
// happen to share a database in dev.
// Returns the locked company's local id and status; its id is NOT always the ZenX id passed
// in. wellness-app's companies table has two unique keys (PRIMARY KEY(id) and uq_companies_slug),
// so a plain ON DUPLICATE KEY UPDATE can collide on the *slug* and quietly update a pre-existing
// row, leaving the ZenX id absent from the table. Deleting a company in ZenX and recreating it
// under the same slug does exactly that: ZenX mints a fresh id while wellness-app still holds the
// old one under that slug. The caller then inserted a user with the ZenX id and hit
// `fk_users_company`, which provisionCustomerAccount swallows as non-fatal — so the ZenX customer
// looked created while its wellness account silently did not exist.
//
// Resolving id-then-slug and handing the effective id back means the FK always points at a row
// that is really there. A slug already held under a different id keeps that id: retargeting it
// would orphan any rows already pointing at it, and wellness-app scopes everything by its own
// company_id anyway (the ZenX id is carried separately on users.zenx_user_id).
async function upsertCompany({ id, name, slug, website, logoUrl, status }, conn) {
  const [byId] = await conn.query('SELECT id, status FROM companies WHERE id = ? LIMIT 1 FOR UPDATE', [id]);
  if (byId[0]) {
    await conn.query('UPDATE companies SET name = ?, slug = ?, website = ?, logo_url = ?, status = ? WHERE id = ?', [
      name,
      slug,
      website ?? null,
      logoUrl,
      status === 'INACTIVE' ? 'INACTIVE' : byId[0].status,
      id,
    ]);
    return { id, status: status === 'INACTIVE' ? 'INACTIVE' : byId[0].status };
  }

  const [bySlug] = await conn.query('SELECT id, status FROM companies WHERE slug = ? LIMIT 1 FOR UPDATE', [slug]);
  if (bySlug[0]) {
    await conn.query('UPDATE companies SET name = ?, website = ?, logo_url = ? WHERE id = ?', [
      name,
      website ?? null,
      logoUrl,
      bySlug[0].id,
    ]);
    return bySlug[0];
  }

  const companyStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await conn.query('INSERT INTO companies (id, name, slug, website, logo_url, status) VALUES (?, ?, ?, ?, ?, ?)', [
    id,
    name,
    slug,
    website ?? null,
    logoUrl,
    companyStatus,
  ]);
  return { id, status: companyStatus };
}

// Idempotent + non-destructive: if this ZenX identity (or, failing that, this email) already has a
// wellness-app account, its tenant, role and account status remain unchanged. Credentials are
// synchronized only after validating the identity; a trusted original owner can initialize an
// unconfigured company, but cannot replace a previously selected owner.
export async function provisionWellnessUser(input, database = pool) {
  if (!database) return null;
  const { zenxUserId, name, email, zenxRole, companyId, companyName, companySlug, website, logoUrl, temporaryPassword, companyStatus } = input;
  if (!zenxUserId || !companyId) throw identityConflict();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const passwordHash = temporaryPassword ? await hashPassword(temporaryPassword) : null;
  return withWellnessTransaction(database, async (conn) => {
    const company = await upsertCompany({ id: companyId, name: companyName, slug: companySlug, website, logoUrl, status: companyStatus }, conn);
    const control = await lockCompanyAccess(conn, company.id);
    const [rows] = await conn.query(
      'SELECT id, company_id, zenx_user_id, email, role, account_status, password_hash FROM users WHERE zenx_user_id = ? OR LOWER(email) = ? ORDER BY id FOR UPDATE',
      [zenxUserId, normalizedEmail]);
    let user = rows.find((row) => row.zenx_user_id === zenxUserId) ?? rows.find((row) => row.email?.toLowerCase() === normalizedEmail);
    if (user) {
      if (user.company_id !== company.id || (user.zenx_user_id && user.zenx_user_id !== zenxUserId)) throw identityConflict();
      if (!user.zenx_user_id) {
        // An email collision in a company recreated under the same slug is not an identity match.
        if (company.id !== companyId || user.role !== toWellnessRole(zenxRole)) throw identityConflict();
        const [linked] = await conn.query('UPDATE users SET zenx_user_id = ? WHERE id = ? AND company_id = ? AND zenx_user_id IS NULL', [zenxUserId, user.id, company.id]);
        if (linked.affectedRows !== 1) throw identityConflict();
        user = { ...user, zenx_user_id: zenxUserId };
      }
      if (passwordHash) await writeWellnessCredential(conn, user, passwordHash, true);
    } else {
      if (!passwordHash) throw new Error('A temporary password is required for a new Wellness account');
      user = { id: newId(), company_id: company.id, zenx_user_id: zenxUserId, role: toWellnessRole(zenxRole), account_status: 'active' };
      await conn.query(
        `INSERT INTO users (id, name, email, password_hash, role, zenx_user_id, company_id, company_slug, must_change_password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [user.id, name, normalizedEmail, passwordHash, user.role, zenxUserId, company.id, companySlug]);
    }
    await initializeTrustedOwner(conn, input, company, user, control);
    return user.id;
  });
}

// Reconcile an already linked account after ZenX has established its durable company owner.
// This never creates/links accounts, changes passwords, changes roles, or transfers ownership.
export async function syncWellnessMainAdmin(input, database = pool) {
  if (!database || !input.companyId || !input.zenxUserId
    || input.mainAdminUserId !== input.zenxUserId || input.zenxRole !== 'wellness_admin'
    || input.companyStatus !== 'ACTIVE') return null;
  return withWellnessTransaction(database, async (conn) => {
    const [companies] = await conn.query('SELECT id, status FROM companies WHERE id = ? LIMIT 1 FOR UPDATE', [input.companyId]);
    const company = companies[0];
    if (!company || company.status !== 'ACTIVE') return null;
    const control = await lockCompanyAccess(conn, company.id);
    const [users] = await conn.query('SELECT id, company_id, zenx_user_id, role, account_status FROM users WHERE zenx_user_id = ? AND company_id = ? LIMIT 1 FOR UPDATE', [input.zenxUserId, company.id]);
    if (!users[0]) return null;
    await initializeTrustedOwner(conn, input, company, users[0], control);
    return users[0].id;
  });
}

async function resolveLocalCompanyId({ zenxCompanyId, slug }) {
  if (!pool) return null;
  if (zenxCompanyId) {
    const [byId] = await pool.query('SELECT id FROM companies WHERE id = ? LIMIT 1', [zenxCompanyId]);
    if (byId[0]) return byId[0].id;
  }
  if (slug) {
    const [bySlug] = await pool.query('SELECT id FROM companies WHERE slug = ? LIMIT 1', [slug]);
    if (bySlug[0]) return bySlug[0].id;
  }
  return null;
}

// Mirrors ZenX company ACTIVE/INACTIVE onto wellness-app's companies.status and, for a deactivation,
// marks every still-active user in that org inactive so they cannot log in or receive mail. A
// reactivation restores only `inactive` users (never `suspended` — that is a local wellness-app
// decision). No-op when WELLNESS_MYSQL_URL is unset or the company has never been mirrored.
export async function syncWellnessCompanyStatus({ zenxCompanyId, slug, status }) {
  if (!pool) return null;
  const localId = await resolveLocalCompanyId({ zenxCompanyId, slug });
  if (!localId) return null;

  const wellnessStatus = status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
  await pool.query('UPDATE companies SET status = ? WHERE id = ?', [wellnessStatus, localId]);

  if (wellnessStatus === 'INACTIVE') {
    await pool.query(
      "UPDATE users SET account_status = 'inactive' WHERE company_id = ? AND account_status = 'active'",
      [localId]
    );
  } else {
    await pool.query(
      "UPDATE users SET account_status = 'active' WHERE company_id = ? AND account_status = 'inactive'",
      [localId]
    );
  }
  return localId;
}

// Mirrors a logo change onto wellness-app, which otherwise only ever receives one at
// provisionWellnessUser time — i.e. never, since a company has no logo the moment it is created.
// `logoUrl` must already be absolute: ZenX serves /uploads off its own origin, but wellness-app
// renders the value in an <img> from a different host, where a bare path would resolve against
// that host and 404. Null clears it, restoring the default Nourishly wordmark.
export async function syncWellnessCompanyLogo({ zenxCompanyId, slug, logoUrl }) {
  if (!pool) return null;
  const localId = await resolveLocalCompanyId({ zenxCompanyId, slug });
  if (!localId) return null;
  await pool.query('UPDATE companies SET logo_url = ? WHERE id = ?', [logoUrl ?? null, localId]);
  return localId;
}

export async function syncWellnessCompanyProfile({ zenxCompanyId, slug, name, website }) {
  if (!pool) return null;
  const localId = await resolveLocalCompanyId({ zenxCompanyId, slug });
  if (!localId) return null;
  await pool.query('UPDATE companies SET name = ?, website = ? WHERE id = ?', [name, website ?? null, localId]);
  return localId;
}

export async function syncWellnessContact({ zenxUserId, name, email, phone }) {
  if (!pool || !zenxUserId) return null;
  const [rows] = await pool.query('SELECT id FROM users WHERE zenx_user_id = ? LIMIT 1', [zenxUserId]);
  if (!rows[0]) return null;
  await pool.query('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?', [
    name,
    email,
    phone ?? null,
    rows[0].id,
  ]);
  return rows[0].id;
}

export async function listWellnessLastLoginsByZenxIds(zenxUserIds) {
  const byId = new Map();
  if (!pool || zenxUserIds.length === 0) return byId;
  let rows;
  try {
    [rows] = await pool.query(
      `SELECT zenx_user_id, last_login FROM users
        WHERE zenx_user_id IN (${zenxUserIds.map(() => '?').join(',')})`,
      zenxUserIds
    );
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') return byId;
    throw err;
  }
  for (const row of rows) {
    if (!row.zenx_user_id || !row.last_login) continue;
    const iso = row.last_login instanceof Date ? row.last_login.toISOString() : new Date(row.last_login).toISOString();
    if (!Number.isNaN(new Date(iso).getTime())) byId.set(row.zenx_user_id, iso);
  }
  return byId;
}

export async function listWellnessClients(zenxCompanyId, slug) {
  if (!pool) return { clients: [], dietitians: [] };
  const localId = await resolveLocalCompanyId({ zenxCompanyId, slug });
  if (!localId) return { clients: [], dietitians: [] };

  const [clients] = await pool.query(
    `SELECT id, name, email, account_status, assigned_dietitian_id, role
       FROM users WHERE company_id = ? AND role = 'client' ORDER BY name`,
    [localId]
  );
  const [dietitians] = await pool.query(
    `SELECT id, name, email, account_status
       FROM users WHERE company_id = ? AND role = 'dietitian' ORDER BY name`,
    [localId]
  );
  return { clients, dietitians };
}

export async function updateWellnessPassword({ zenxUserId, passwordHash, mustChangePassword, companyId }, database = pool) {
  if (!database || !passwordHash || !zenxUserId) return null;
  return withWellnessTransaction(database, async (conn) => {
    if (companyId) {
      // A slug match cannot authorize a credential write into a historical company that
      // happens to use the same public URL.
      const [companies] = await conn.query('SELECT id, status FROM companies WHERE id = ? LIMIT 1 FOR UPDATE', [companyId]);
      if (!companies[0]) return null;
      await lockCompanyAccess(conn, companyId);
    }
    const [linked] = await conn.query(
      `SELECT id, password_hash, company_id, zenx_user_id FROM users WHERE zenx_user_id = ?${companyId ? ' AND company_id = ?' : ''} LIMIT 1 FOR UPDATE`,
      companyId ? [zenxUserId, companyId] : [zenxUserId]);
    if (linked[0]) return writeWellnessCredential(conn, linked[0], passwordHash, mustChangePassword);
    // Password synchronization has no authority to establish identities: callers can include
    // customers with only another application's grant. Provisioning or signed SSO must link an
    // account first, after checking its grant, company and role.
    return null;
  });
}

export async function updateWellnessAssignedDietitian({ zenxCompanyId, slug, userId, dietitianId }) {
  if (!pool) return null;
  const localId = await resolveLocalCompanyId({ zenxCompanyId, slug });
  if (!localId) return null;

  const [clients] = await pool.query(
    "SELECT id FROM users WHERE id = ? AND company_id = ? AND role = 'client' LIMIT 1",
    [userId, localId]
  );
  if (!clients[0]) return null;

  if (dietitianId) {
    const [dietitians] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND company_id = ? AND role = 'dietitian' LIMIT 1",
      [dietitianId, localId]
    );
    if (!dietitians[0]) return null;
  }

  await pool.query('UPDATE users SET assigned_dietitian_id = ? WHERE id = ?', [dietitianId || null, userId]);
  const [rows] = await pool.query(
    'SELECT id, name, email, account_status, assigned_dietitian_id, role FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}
