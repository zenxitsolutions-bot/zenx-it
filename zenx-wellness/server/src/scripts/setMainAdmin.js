import { pool } from '../db/pool.js';
import { initializeMainAdmin } from '../models/AccessControl.js';
import { safeErrorMeta } from '../utils/safeError.js';

// Explicit operator bootstrap only. Never invoked by db:migrate, startup or SSO.
const args = process.argv.slice(2);
const option = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
async function main() {
  const companySlug = option('--company-slug');
  const email = option('--email');
  if (!companySlug || !email || !args.includes('--confirm')) {
    console.error('Usage: node src/scripts/setMainAdmin.js --company-slug <company> --email <existing-admin-email> --confirm');
    process.exitCode = 1;
    return;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [companies] = await conn.query('SELECT id FROM companies WHERE slug = ? FOR UPDATE', [companySlug]);
    if (!companies[0]) throw new Error('Company not found');
    const [users] = await conn.query("SELECT id FROM users WHERE company_id = ? AND LOWER(email) = ? AND role = 'admin' AND account_status = 'active' FOR UPDATE", [companies[0].id, email.trim().toLowerCase()]);
    if (users.length !== 1) throw new Error('Select exactly one active existing admin in that company');
    const changed = await initializeMainAdmin({ companyId: companies[0].id, userId: users[0].id }, conn);
    await conn.commit();
    console.log(changed ? '[permissions] main admin configured; sign in again to load permissions' : '[permissions] this main admin is already configured');
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}
main().catch((error) => {
  console.error('[permissions] setup failed; verify the company/admin and migration', safeErrorMeta(error));
  process.exitCode = 1;
}).finally(() => pool.end());
