import { readFileSync } from 'node:fs';
import { safeErrorMeta } from '../utils/safeError.js';
import {
  LOCAL_PERMISSION_TABLES, localSetupError, parseLocalSetupArgs, assertLocalSetupEnvironment,
  extractLocalSetupStatements, verifyLocalSetupTables,
} from './localPermissionsSetup.js';

// Explicit LOCAL-ONLY additive setup. Never called by startup or normal migrations.
// Run from server/: node src/scripts/setupLocalPermissions.js --company-slug <company>
//   --email <existing-admin-email> --confirm
// DDL commits in MySQL: a later failure can leave new empty tables, never roll them back/drop them.
async function main() {
  const { companySlug, email } = parseLocalSetupArgs(process.argv.slice(2));
  const { env } = await import('../config/env.js');
  assertLocalSetupEnvironment(env);
  const statements = extractLocalSetupStatements(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  // Do not even import/create the DB pool until explicit arguments and the loopback guard pass.
  const { pool } = await import('../db/pool.js');
  let conn;
  try {
    const { initializeMainAdmin, hydrateUserPermissions } = await import('../models/AccessControl.js');
    conn = await pool.getConnection();
    const findCandidate = async ({ lock = false } = {}) => {
      const [companies] = await conn.query(
        `SELECT id, status FROM companies WHERE slug = ?${lock ? ' FOR UPDATE' : ''}`, [companySlug]);
      if (companies.length !== 1 || companies[0].status !== 'ACTIVE') throw localSetupError('ERR_LOCAL_SETUP_COMPANY');
      const [users] = await conn.query(
        `SELECT id FROM users WHERE company_id = ? AND LOWER(email) = ? AND role = 'admin' AND account_status = 'active'${lock ? ' FOR UPDATE' : ''}`,
        [companies[0].id, email]);
      if (users.length !== 1) throw localSetupError('ERR_LOCAL_SETUP_ADMIN');
      return { companyId: companies[0].id, userId: users[0].id };
    };
    const inspectTables = async () => {
      const names = Object.keys(LOCAL_PERMISSION_TABLES);
      const placeholders = names.map(() => '?').join(', ');
      const [tables] = await conn.query(
        `SELECT TABLE_NAME AS table_name, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})`, names);
      const [columns] = await conn.query(
        `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})`, names);
      return { tables, columns };
    };
    const checkOwner = async (candidate, { lock = false } = {}) => {
      const [owners] = await conn.query(
        `SELECT main_admin_user_id FROM company_access_control WHERE company_id = ?${lock ? ' FOR UPDATE' : ''}`, [candidate.companyId]);
      if (owners.length > 1 || (owners[0] && owners[0].main_admin_user_id !== candidate.userId)) throw localSetupError('ERR_LOCAL_SETUP_OWNER_CONFLICT');
    };

    // Identity and existing table compatibility are validated before ANY DDL.
    const candidate = await findCandidate();
    const before = await inspectTables();
    const present = verifyLocalSetupTables(before.tables, before.columns);
    if (present.has('company_access_control')) await checkOwner(candidate);
    let created = 0;
    for (const { table, statement } of statements) {
      if (!present.has(table)) { await conn.query(statement); created++; }
    }
    const after = await inspectTables();
    verifyLocalSetupTables(after.tables, after.columns, { requireAll: true });
    console.log(`[permissions] local prerequisite tables verified; ${created} missing table(s) created`);

    await conn.beginTransaction();
    try {
      const lockedCandidate = await findCandidate({ lock: true });
      // Do not silently switch target if an identity was changed during DDL.
      if (lockedCandidate.companyId !== candidate.companyId || lockedCandidate.userId !== candidate.userId) {
        throw localSetupError('ERR_LOCAL_SETUP_IDENTITY_CHANGED');
      }
      await checkOwner(lockedCandidate, { lock: true });
      const changed = await initializeMainAdmin(lockedCandidate, conn);
      const verified = await hydrateUserPermissions({ id: candidate.userId, companyId: candidate.companyId, role: 'admin' }, conn, { forUpdate: true });
      if (!verified.isMainAdmin || !verified.permissionsConfigured) throw localSetupError('ERR_LOCAL_SETUP_VERIFY');
      await conn.commit();
      console.log(changed ? '[permissions] local main admin configured and verified; sign out and sign in again' : '[permissions] local main admin already configured and verified; sign in again');
    } catch (error) {
      await conn.rollback();
      throw error;
    }
  } finally {
    conn?.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[permissions] local setup failed', safeErrorMeta(error));
  if (error?.code === 'ERR_LOCAL_SETUP_USAGE') {
    console.error('Usage: node src/scripts/setupLocalPermissions.js --company-slug <company> --email <existing-admin-email> --confirm');
  }
  process.exitCode = 1;
});
