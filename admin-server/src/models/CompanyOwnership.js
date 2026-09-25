import { withTransaction } from '../db/pool.js';

async function lockCompany(companyId, conn) {
  const [rows] = await conn.query(
    'SELECT id, status, main_admin_user_id FROM companies WHERE id = ? LIMIT 1 FOR UPDATE', [companyId]);
  return rows[0] ?? null;
}

async function storeOwner(company, candidate, conn, { allowInactiveCompany = false } = {}) {
  if ((!allowInactiveCompany && company.status !== 'ACTIVE') || candidate?.user_status !== 'ACTIVE' || candidate?.grant_status !== 'ACTIVE') return null;
  await conn.query('UPDATE companies SET main_admin_user_id = ? WHERE id = ? AND main_admin_user_id IS NULL', [candidate.id, company.id]);
  return candidate.id;
}

// Called inside the new-company provisioning transaction with the exact customer just created.
// An existing owner is immutable here: neither provisioning nor login transfers ownership.
export async function initializeCompanyMainAdmin({ companyId, userId, allowInactiveCompany = false }, conn) {
  const company = await lockCompany(companyId, conn);
  if (!company) return null;
  if (company.main_admin_user_id) return company.main_admin_user_id;
  const [candidates] = await conn.query(
    `SELECT u.id, u.status AS user_status, aa.status AS grant_status
       FROM application_access aa JOIN users u ON u.id = aa.user_id
       WHERE aa.company_id = ? AND aa.application = 'zenx-dietitian' AND aa.role = 'wellness_admin'
         AND u.id = ? FOR UPDATE`, [companyId, userId]);
  return storeOwner(company, candidates[0], conn, { allowInactiveCompany });
}

// Legacy companies have no persisted owner. Only a single distinct platform admin identity is
// unambiguous; disabled users/grants still count so disabling a competing admin cannot elect one.
// Never choose by sign-in order, email address, or a local Wellness staff role.
export async function reconcileCompanyMainAdmin({ companyId }, connection) {
  const reconcile = async (conn) => {
    const company = await lockCompany(companyId, conn);
    if (!company) return null;
    if (company.main_admin_user_id) return company.main_admin_user_id;
    if (company.status !== 'ACTIVE') return null;
    const [candidates] = await conn.query(
      `SELECT u.id, u.status AS user_status, aa.status AS grant_status
         FROM application_access aa JOIN users u ON u.id = aa.user_id
         WHERE aa.company_id = ? AND aa.application = 'zenx-dietitian' AND aa.role = 'wellness_admin'
         ORDER BY u.id FOR UPDATE`, [companyId]);
    if (new Set(candidates.map((candidate) => candidate.id)).size !== 1) return null;
    if (candidates.some((candidate) => candidate.user_status !== 'ACTIVE' || candidate.grant_status !== 'ACTIVE')) return null;
    return storeOwner(company, candidates[0], conn);
  };
  return connection ? reconcile(connection) : withTransaction(reconcile);
}
