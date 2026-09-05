// Integration test — needs a real, reachable MySQL matching server/.env's MYSQL_URL, migrated
// (run `npm run db:migrate` first) — same requirement availability.race.test.js already has.
//
// Proves the core multi-tenancy guarantee from docs/specs (2026-08-27, shared ZenX auth): two
// companies' data never leaks into each other's company-scoped queries or ownership checks, even
// when both companies otherwise look identical (same roles, same relative structure).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/db/pool.js';
import { newId } from '../../src/db/id.js';
import { createUser, listUsers, countUsers } from '../../src/models/User.js';
import { createRecipe, listRecipes } from '../../src/models/Recipe.js';
import { createEnquiry, listEnquiries } from '../../src/models/Enquiry.js';
import { assertUserInCompany, assertDietitianOwnsClient } from '../../src/utils/scope.js';
import { ApiError } from '../../src/utils/ApiError.js';

let companyA, companyB;
let adminA, dietitianA, clientA;
let adminB, dietitianB, clientB;
const userIds = [];

before(async () => {
  companyA = newId();
  companyB = newId();

  // users.company_id is a real FK into companies, so the company rows must exist before any user
  // can point at them. Creating users first made this whole file fail in before(), which left
  // after() (and its pool.end()) unreached — so the run hung on an open pool instead of reporting
  // a constraint error. This is the `fk_users_company` item the 2026-08-28 worklog carried over.
  await pool.query('INSERT INTO companies (id, name, slug, status) VALUES (?, ?, ?, ?), (?, ?, ?, ?)', [
    companyA, 'Isolation Test A', `isolation-test-a-${companyA.slice(0, 8)}`, 'ACTIVE',
    companyB, 'Isolation Test B', `isolation-test-b-${companyB.slice(0, 8)}`, 'ACTIVE',
  ]);

  async function makeCompanyUsers(companyId, tag) {
    const admin = await createUser({
      name: `${tag} Admin`,
      email: `${tag.toLowerCase()}-admin-${companyId}@test.local`,
      passwordHash: 'x',
      role: 'admin',
      companyId,
    });
    const dietitian = await createUser({
      name: `${tag} Dietitian`,
      email: `${tag.toLowerCase()}-dietitian-${companyId}@test.local`,
      passwordHash: 'x',
      role: 'dietitian',
      companyId,
    });
    const client = await createUser({
      name: `${tag} Client`,
      email: `${tag.toLowerCase()}-client-${companyId}@test.local`,
      passwordHash: 'x',
      role: 'client',
      assignedDietitian: dietitian.id,
      companyId,
    });
    userIds.push(admin.id, dietitian.id, client.id);
    return { admin, dietitian, client };
  }

  ({ admin: adminA, dietitian: dietitianA, client: clientA } = await makeCompanyUsers(companyA, 'A'));
  ({ admin: adminB, dietitian: dietitianB, client: clientB } = await makeCompanyUsers(companyB, 'B'));

  await createRecipe({ title: 'A-only recipe', mealType: 'Breakfast', prepTime: '5 min', ingredients: 'x', instructions: 'x', createdBy: dietitianA.id });
  await createEnquiry({ companyId: companyA, goal: 'A goal', name: 'A Lead', email: `a-lead-${companyA}@test.local`, phone: '1234567890' });
});

after(async () => {
  // Cascades: users -> recipes/enquiries (FKs are ON DELETE CASCADE/SET NULL — see schema.sql).
  await pool.query(`DELETE FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`, userIds);
  await pool.query('DELETE FROM enquiries WHERE company_id IN (?, ?)', [companyA, companyB]);
  await pool.query('DELETE FROM companies WHERE id IN (?, ?)', [companyA, companyB]);
  await pool.end();
});

test('listUsers/countUsers scoped to one company never returns the other company\'s rows', async () => {
  const usersInA = await listUsers({ companyId: companyA });
  assert.ok(usersInA.some((u) => u.id === adminA.id));
  assert.ok(!usersInA.some((u) => u.id === adminB.id), 'company B admin leaked into company A listUsers');

  const clientCountA = await countUsers({ companyId: companyA, role: 'client' });
  const clientCountB = await countUsers({ companyId: companyB, role: 'client' });
  assert.equal(clientCountA, 1);
  assert.equal(clientCountB, 1);
});

test('listRecipes scoped to one company excludes a recipe created inside the other company', async () => {
  const recipesInB = await listRecipes({ companyId: companyB });
  assert.equal(recipesInB.length, 0, 'company A\'s recipe leaked into company B listRecipes');

  const recipesInA = await listRecipes({ companyId: companyA });
  assert.equal(recipesInA.length, 1);
});

test('listEnquiries scoped to one company excludes the other company\'s enquiry', async () => {
  const enquiriesInB = await listEnquiries({ companyId: companyB });
  assert.equal(enquiriesInB.length, 0);
});

test('assertUserInCompany rejects a real user id from a different company (404, not 403 — existence is not revealed)', async () => {
  const reqAsAdminA = { user: adminA };
  await assert.rejects(
    () => assertUserInCompany(reqAsAdminA, clientB.id),
    (err) => err instanceof ApiError && err.status === 404
  );
  // Same-company id is fine.
  await assertUserInCompany(reqAsAdminA, clientA.id);
});

test('assertDietitianOwnsClient rejects cross-company even for admin — admin is org-scoped, not platform-scoped', async () => {
  const reqAsAdminA = { user: adminA };
  await assert.rejects(
    () => assertDietitianOwnsClient(reqAsAdminA, clientB.id),
    (err) => err instanceof ApiError && err.status === 404
  );

  // Same-company, and clientB really is assigned to dietitianB — must resolve without throwing.
  const reqAsDietitianB = { user: dietitianB };
  await assertDietitianOwnsClient(reqAsDietitianB, clientB.id);
});
