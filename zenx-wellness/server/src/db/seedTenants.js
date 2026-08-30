// Two-tenant fixture for exercising company isolation end to end (`npm run seed:tenants`).
//
// Mirrors the worked example in docs/specs: ABC Nutrition and XYZ Wellness, four named users, and
// one client per company so cross-tenant reads have something real to fail to reach. Idempotent —
// re-running updates the companies and leaves existing users alone, so it is safe to run against a
// dev database that already has it.
//
// Deliberately NOT part of `npm run seed`: it creates accounts with a known shared password, which
// belongs in a dev/test database only. Guarded against NODE_ENV=production below.
import { pathToFileURL } from 'node:url';
import { pool } from './pool.js';
import { newId } from './id.js';
import { hashPassword } from '../utils/password.js';
import { findUserByEmail, createUser } from '../models/User.js';
import { createRecipe, listRecipes } from '../models/Recipe.js';
import { createEnquiry, listEnquiries } from '../models/Enquiry.js';
import { createProgramPlan, listProgramPlans } from '../models/ProgramPlan.js';
import { env } from '../config/env.js';

export const TENANT_PASSWORD = 'TenantTest123!';

export const TENANTS = [
  {
    key: 'abc',
    name: 'ABC Nutrition',
    slug: 'abc-nutrition',
    logoUrl: 'https://placehold.co/160x160/173f36/fbf8f1?text=ABC',
    users: [
      { name: 'John Carter', email: 'john@abc-nutrition.test', role: 'admin' },
      { name: 'Sarah Blake', email: 'sarah@abc-nutrition.test', role: 'dietitian' },
      { name: 'Amy Client', email: 'amy@abc-nutrition.test', role: 'client', assignTo: 'sarah@abc-nutrition.test' },
    ],
  },
  {
    key: 'xyz',
    name: 'XYZ Wellness',
    slug: 'xyz-wellness',
    logoUrl: 'https://placehold.co/160x160/0e3028/fbf8f1?text=XYZ',
    users: [
      { name: 'David Nolan', email: 'david@xyz-wellness.test', role: 'admin' },
      { name: 'Mary Quinn', email: 'mary@xyz-wellness.test', role: 'dietitian' },
      { name: 'Ben Client', email: 'ben@xyz-wellness.test', role: 'client', assignTo: 'mary@xyz-wellness.test' },
    ],
  },
];

// A company row must exist before any user can point company_id at it — users.company_id is a real
// FK. Creating the users first is what made tests/integration/multiTenant.isolation.test.js hang
// on a constraint failure rather than fail cleanly.
async function upsertCompany({ name, slug, logoUrl }) {
  const [existing] = await pool.query('SELECT id FROM companies WHERE slug = ? LIMIT 1', [slug]);
  if (existing[0]) {
    await pool.query('UPDATE companies SET name = ?, logo_url = ?, status = ? WHERE id = ?', [name, logoUrl, 'ACTIVE', existing[0].id]);
    return existing[0].id;
  }
  const id = newId();
  await pool.query('INSERT INTO companies (id, name, slug, logo_url, status) VALUES (?, ?, ?, ?, ?)', [id, name, slug, logoUrl, 'ACTIVE']);
  return id;
}

export async function seedTenants({ log = console.log } = {}) {
  if (env.nodeEnv === 'production') throw new Error('seedTenants: refusing to run against NODE_ENV=production');

  const passwordHash = await hashPassword(TENANT_PASSWORD);
  const result = [];

  for (const tenant of TENANTS) {
    const companyId = await upsertCompany(tenant);
    log(`[seed:tenants] ${tenant.name} -> ${companyId} (/${tenant.slug})`);

    // Two passes: every dietitian must exist before a client can be assigned to one.
    const byEmail = new Map();
    for (const spec of tenant.users.filter((u) => !u.assignTo)) {
      byEmail.set(spec.email, await ensureUser(spec, tenant, companyId, passwordHash, null, log));
    }
    for (const spec of tenant.users.filter((u) => u.assignTo)) {
      const dietitian = byEmail.get(spec.assignTo);
      byEmail.set(spec.email, await ensureUser(spec, tenant, companyId, passwordHash, dietitian?.id ?? null, log));
    }

    await seedTenantData(tenant, companyId, byEmail, log);
    result.push({ ...tenant, companyId, users: [...byEmail.values()] });
  }

  log(`[seed:tenants] password for every seeded account: ${TENANT_PASSWORD}`);
  return result;
}

// One clearly-labelled row per company in each company-scoped collection. Without these, an
// isolation check like "ABC's /recipes contains nothing belonging to XYZ" passes trivially on an
// empty table and proves nothing — the probe needs each tenant to actually hold data the other
// must not see.
async function seedTenantData(tenant, companyId, byEmail, log) {
  const marker = `${tenant.slug} only`;
  const dietitian = [...byEmail.values()].find((u) => u.role === 'dietitian');

  const recipes = await listRecipes({ companyId });
  if (!recipes.some((r) => r.title === marker)) {
    await createRecipe({
      title: marker,
      mealType: 'Breakfast',
      prepTime: '5 min',
      ingredients: `${tenant.name} ingredients`,
      instructions: `${tenant.name} instructions`,
      // Recipes carry no company of their own in listRecipes' filter — it scopes by the creating
      // user's company (`u.company_id`), so the dietitian is what places this row in the tenant.
      createdBy: dietitian?.id ?? null,
    });
    log(`[seed:tenants]   + recipe "${marker}"`);
  }

  const enquiries = await listEnquiries({ companyId });
  if (!enquiries.some((e) => e.name === marker)) {
    await createEnquiry({
      companyId,
      goal: 'Weight loss',
      name: marker,
      email: `lead@${tenant.slug}.test`,
      phone: '5550000000',
    });
    log(`[seed:tenants]   + enquiry "${marker}"`);
  }

  const plans = await listProgramPlans({ companyId });
  if (!plans.some((p) => p.name === marker)) {
    await createProgramPlan({ companyId, name: marker, description: `${tenant.name} program` });
    log(`[seed:tenants]   + program plan "${marker}"`);
  }
}

async function ensureUser(spec, tenant, companyId, passwordHash, assignedDietitian, log) {
  const existing = await findUserByEmail(spec.email);
  if (existing) {
    // Keep an already-present account pinned to this tenant, so a half-seeded database converges
    // instead of leaving a user stranded in the wrong company.
    await pool.query('UPDATE users SET company_id = ?, company_slug = ? WHERE id = ?', [companyId, tenant.slug, existing.id]);
    log(`[seed:tenants]   = ${spec.email} (${spec.role}, existed)`);
    return { ...existing, companyId, companySlug: tenant.slug };
  }
  const user = await createUser({
    name: spec.name,
    email: spec.email,
    passwordHash,
    role: spec.role,
    assignedDietitian,
    companyId,
    companySlug: tenant.slug,
  });
  log(`[seed:tenants]   + ${spec.email} (${spec.role})`);
  return user;
}

// Only self-executes when run directly (`node src/db/seedTenants.js`), so the integration test can
// import seedTenants() without the pool being closed out from under it. pathToFileURL, not string
// concatenation: on Windows argv[1] is a `D:\...` path, which a hand-built `file://` prefix gets
// wrong (slash count and drive letter), silently turning this block into dead code.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedTenants()
    .then(() => pool.end())
    .catch((err) => {
      console.error('[seed:tenants] failed', err);
      process.exit(1);
    });
}
