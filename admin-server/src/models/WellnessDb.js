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
  if (byZenxId[0]) return byZenxId[0].id;

  const [byEmail] = await pool.query('SELECT id, zenx_user_id FROM users WHERE email = ? LIMIT 1', [email]);
  if (byEmail[0]) {
    if (!byEmail[0].zenx_user_id) {
      await pool.query('UPDATE users SET zenx_user_id = ? WHERE id = ?', [zenxUserId, byEmail[0].id]);
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
