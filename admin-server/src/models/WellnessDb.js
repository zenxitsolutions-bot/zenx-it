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

// wellness-app's own auth.controller.js#handoff maps its per-application `role` claim the same
// way: 'wellness_admin' becomes the local `admin` role, anything else falls back to `dietitian`.
// Mirrored here so an eagerly-created row and a lazily-SSO'd one always end up with the same role.
function toWellnessRole(zenxRole) {
  return zenxRole === 'wellness_admin' ? 'admin' : 'dietitian';
}

// Mirrors wellness-app's own models/Company.js#upsertCompanyFromHandoff — kept as a second copy
// (not a shared package) since the two apps are deliberately independent deployments that just
// happen to share a database in dev.
// Returns the id the company actually has in wellness-app, which is NOT always the ZenX id passed
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
async function upsertCompany({ id, name, slug, website, logoUrl }) {
  const [byId] = await pool.query('SELECT id FROM companies WHERE id = ? LIMIT 1', [id]);
  if (byId[0]) {
    await pool.query('UPDATE companies SET name = ?, slug = ?, website = ?, logo_url = ? WHERE id = ?', [
      name,
      slug,
      website ?? null,
      logoUrl,
      id,
    ]);
    return id;
  }

  const [bySlug] = await pool.query('SELECT id FROM companies WHERE slug = ? LIMIT 1', [slug]);
  if (bySlug[0]) {
    await pool.query('UPDATE companies SET name = ?, website = ?, logo_url = ? WHERE id = ?', [
      name,
      website ?? null,
      logoUrl,
      bySlug[0].id,
    ]);
    return bySlug[0].id;
  }

  await pool.query('INSERT INTO companies (id, name, slug, website, logo_url) VALUES (?, ?, ?, ?, ?)', [
    id,
    name,
    slug,
    website ?? null,
    logoUrl,
  ]);
  return id;
}

// Idempotent + non-destructive: if this ZenX identity (or, failing that, this email) already has a
// wellness-app account — most likely from a prior SSO login before this eager path existed — it's
// left alone (only linked by zenx_user_id if it was missing) rather than overwritten. Only a
// genuinely new identity gets a fresh row.
export async function provisionWellnessUser({ zenxUserId, name, email, zenxRole, companyId, companyName, companySlug, website, logoUrl, temporaryPassword }) {
  if (!pool) return null;

  // Use the id the mirror actually resolved to, not the ZenX id — see upsertCompany.
  const localCompanyId = await upsertCompany({ id: companyId, name: companyName, slug: companySlug, website, logoUrl });

  const [byZenxId] = await pool.query('SELECT id FROM users WHERE zenx_user_id = ? LIMIT 1', [zenxUserId]);
  if (byZenxId[0]) {
    // SSO handoff creates the row first with a random unusable hash. Without this update the
    // customer can never log in on wellness-app's own /login with the password they were given.
    if (temporaryPassword) {
      const passwordHash = await hashPassword(temporaryPassword);
      await pool.query(
        'UPDATE users SET password_hash = ?, must_change_password = TRUE WHERE id = ?',
        [passwordHash, byZenxId[0].id]
      );
    }
    return byZenxId[0].id;
  }

  const [byEmail] = await pool.query('SELECT id, zenx_user_id FROM users WHERE LOWER(email) = ? LIMIT 1', [
    String(email).trim().toLowerCase(),
  ]);
  if (byEmail[0]) {
    if (!byEmail[0].zenx_user_id) {
      await pool.query('UPDATE users SET zenx_user_id = ? WHERE id = ?', [zenxUserId, byEmail[0].id]);
    }
    if (temporaryPassword) {
      const passwordHash = await hashPassword(temporaryPassword);
      await pool.query(
        'UPDATE users SET password_hash = ?, must_change_password = TRUE WHERE id = ?',
        [passwordHash, byEmail[0].id]
      );
    }
    return byEmail[0].id;
  }

  const id = newId();
  // Same temporary password shown for the ZenX account, so it also works logging in directly on
  // wellness-app's own login page (not just via SSO handoff) — must_change_password mirrors
  // wellness-app's own admin-create-a-user convention (user.controller.js#createUser) so it's
  // forced to be replaced on first use there too, same as it already is on the ZenX side.
  const passwordHash = await hashPassword(temporaryPassword);
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role, zenx_user_id, company_id, company_slug, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [id, name, email, passwordHash, toWellnessRole(zenxRole), zenxUserId, localCompanyId, companySlug]
  );
  return id;
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

export async function updateWellnessPassword({ zenxUserId, email, passwordHash, mustChangePassword }) {
  if (!pool || !passwordHash) return null;
  if (zenxUserId) {
    const [rows] = await pool.query('SELECT id FROM users WHERE zenx_user_id = ? LIMIT 1', [zenxUserId]);
    if (rows[0]) {
      await pool.query('UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?', [
        passwordHash,
        Boolean(mustChangePassword),
        rows[0].id,
      ]);
      return rows[0].id;
    }
  }
  if (email) {
    const [rows] = await pool.query('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [
      String(email).trim().toLowerCase(),
    ]);
    if (rows[0]) {
      await pool.query('UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?', [
        passwordHash,
        Boolean(mustChangePassword),
        rows[0].id,
      ]);
      return rows[0].id;
    }
  }
  return null;
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
