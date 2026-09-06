import { pool } from './db/pool.js';
import { newId } from './db/id.js';
import { hashPassword } from './utils/password.js';
import { findProfileByEmail, createProfile } from './models/Profile.js';
import { findCompanyBySlug, createCompany } from './models/Company.js';
import { findUserByEmail, createUser } from './models/ZenxUser.js';
import { findApplicationAccess, createApplicationAccess } from './models/ApplicationAccess.js';
import { env } from './config/env.js';

const SEED_EMAIL = 'admin@zenxitsolutions.com';
const SEED_PASSWORD = 'ZenXAdmin123!';

// The real, ZenX-managed tenant that Wellness's pre-existing (pre-multi-tenant) data gets
// backfilled onto — see wellness-app/server/src/db/migrate.js's LEGACY_COMPANY_ID backfill and
// docs/specs. ZenX stays the single source of truth for tenant identity even for this one
// grandfathered company, instead of Wellness inventing its own unmanaged id.
const LEGACY_COMPANY_SLUG = 'legacy-practice';
const LEGACY_COMPANY_EMAIL = 'legacy-practice@zenxitsolutions.com';
const LEGACY_COMPANY_PASSWORD = 'ZenXLegacy123!';
// Pinned, not a fresh newId() — matches the id already backfilled onto wellness-app's pre-existing
// data (its local `nourishly`.`companies` table already had this exact row, company_name
// "Nourishly Demo", from before this seed existed). Using the same id here means the two sides
// agree on which company "legacy" actually is instead of silently diverging.
const LEGACY_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

async function seedApplications() {
  const rows = [
    {
      slug: 'zenx-dietitian',
      name: 'ZenX Dietitian',
      description: 'Nutrition / dietitian client management platform.',
      url: env.zenxDietitianUrl || null,
      handoffSecret: env.zenxDietitianHandoffSecret || null,
    },
    { slug: 'zenx-pos', name: 'ZenX POS', description: 'Point of sale for small businesses.', url: null, handoffSecret: null },
  ];
  for (const row of rows) {
    const [existing] = await pool.query('SELECT id FROM applications WHERE slug = ?', [row.slug]);
    if (existing.length) {
      await pool.query('UPDATE applications SET url = ?, handoff_secret = ? WHERE slug = ?', [row.url, row.handoffSecret, row.slug]);
      console.log(`[seed] updated application: ${row.slug}`);
      continue;
    }
    await pool.query('INSERT INTO applications (id, name, slug, description, url, handoff_secret) VALUES (?, ?, ?, ?, ?, ?)', [
      newId(),
      row.name,
      row.slug,
      row.description,
      row.url,
      row.handoffSecret,
    ]);
    console.log(`[seed] created application: ${row.slug}`);
  }
}

async function seedSuperAdmin() {
  if (await findProfileByEmail(SEED_EMAIL)) {
    console.log(`[seed] already exists, skipped: ${SEED_EMAIL}`);
    return;
  }
  await createProfile({
    firstName: 'Aria',
    lastName: 'Chen',
    email: SEED_EMAIL,
    passwordHash: await hashPassword(SEED_PASSWORD),
    role: 'Super Admin',
  });
  console.log(`[seed] created: ${SEED_EMAIL} (password: ${SEED_PASSWORD})`);
}

// Idempotent, same pattern as seedSuperAdmin: creates the company, its customer contact, and its
// zenx-dietitian application_access grant once; re-running just prints the already-existing id.
// role: 'wellness_admin' matches provisioning.controller.js#defaultRoleFor('zenx-dietitian') — the
// same role a freshly provisioned company would get — so this account behaves identically to a
// real customer's, not a special case.
async function seedLegacyCompany() {
  let company = await findCompanyBySlug(LEGACY_COMPANY_SLUG);
  if (!company) {
    company = await createCompany({ id: LEGACY_COMPANY_ID, companyName: 'Legacy Practice', companySlug: LEGACY_COMPANY_SLUG, companyEmail: LEGACY_COMPANY_EMAIL });
    console.log(`[seed] created company: ${LEGACY_COMPANY_SLUG} (id: ${company.id})`);
  } else {
    console.log(`[seed] already exists, skipped company: ${LEGACY_COMPANY_SLUG} (id: ${company.id})`);
  }

  let user = await findUserByEmail(LEGACY_COMPANY_EMAIL);
  if (!user) {
    user = await createUser({
      email: LEGACY_COMPANY_EMAIL,
      passwordHash: await hashPassword(LEGACY_COMPANY_PASSWORD),
      firstName: 'Legacy',
      lastName: 'Practice',
      mustChangePassword: true,
    });
    console.log(`[seed] created customer user: ${LEGACY_COMPANY_EMAIL} (password: ${LEGACY_COMPANY_PASSWORD})`);
  } else {
    console.log(`[seed] already exists, skipped customer user: ${LEGACY_COMPANY_EMAIL}`);
  }

  if (!(await findApplicationAccess(user.id, company.id, 'zenx-dietitian'))) {
    await createApplicationAccess({ userId: user.id, companyId: company.id, application: 'zenx-dietitian', role: 'wellness_admin' });
    console.log('[seed] granted zenx-dietitian access to legacy company');
  }

  console.log(`[seed] LEGACY_COMPANY_ID=${company.id}  <- set this in wellness-app/server/.env before running its db:migrate`);
}

async function seed() {
  await seedApplications();
  await seedSuperAdmin();
  await seedLegacyCompany();
  await pool.end();
}

seed().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
