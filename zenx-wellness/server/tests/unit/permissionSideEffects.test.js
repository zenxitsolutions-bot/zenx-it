import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/db/pool.js';
import { createPlan, updatePlan, deletePlan } from '../../src/controllers/plan.controller.js';
import { updatePlanById, deletePlanById } from '../../src/models/Plan.js';
import { updateEnquiry } from '../../src/controllers/enquiry.controller.js';
import { createCall, deleteCall } from '../../src/controllers/call.controller.js';
import { adminOverview, dietitianOverview } from '../../src/controllers/insights.controller.js';
import { createLiveSessionGuard } from '../../src/services/liveSessionGuard.js';

const staff = (permissions = {}, role = 'admin') => ({ id: 'staff', role, companyId: 'company', permissionOverrides: permissions });
async function invoke(controller, user, body = {}, id = 'record') {
  let error, result;
  const res = { json(value) { result = value; return this; }, status() { return this; }, send(value) { result = value; return this; } };
  await controller({ user, body, params: { id }, query: {} }, res, (value) => { error = value; });
  return { error, result };
}

test('publishing permission covers live edits, unpublishing, deletes, and swap notifications', async (t) => {
  let published = true;
  const writes = [];
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM plans p')) return [[{ id: 'record', client_id: 'client', dietitian_id: 'staff', published, week: '2026-09-21', week_end: '2026-09-27' }]];
    if (sql.includes('FROM plan_meals pm')) return [[]];
    if (sql.includes('FROM users u')) return [[{ id: 'staff', company_id: 'company', role: 'dietitian' }]];
    writes.push(sql);
    throw new Error('A denied plan action must not write');
  });
  const editor = staff({ 'diet_plans.publish': false });
  for (const patch of [{ title: 'Alter live content' }, { published: false }, { notifySwaps: true }, { published: true }]) {
    assert.equal((await invoke(updatePlan, editor, patch)).error?.status, 403);
  }
  assert.equal((await invoke(deletePlan, editor)).error?.status, 403);
  published = false;
  for (const patch of [{ published: true }, { notifySwaps: true }]) assert.equal((await invoke(updatePlan, editor, patch)).error?.status, 403);
  assert.equal((await invoke(createPlan, editor, { client: 'client', dietitian: 'staff', published: true })).error?.status, 403);
  assert.deepEqual(writes, []);
});

test('publishing can be granted without permission to edit draft content', async (t) => {
  let published = true;
  const writes = [];
  async function query(sql, params) {
    if (sql.includes('FROM plans p')) return [[{ id: 'record', client_id: 'client', dietitian_id: 'staff', published, week: '2026-09-21', week_end: '2026-09-27' }]];
    if (sql.includes('FROM plan_meals pm')) return [[]];
    if (sql.includes('FROM users u')) return [[{ id: 'staff', company_id: 'company', role: 'dietitian' }]];
    if (sql.startsWith('UPDATE plans SET published = ?')) { published = params[0]; writes.push(sql); return [{ affectedRows: 1 }]; }
    throw new Error('Unexpected query in publication-only fixture');
  }
  t.mock.method(pool, 'query', query);
  t.mock.method(pool, 'getConnection', async () => ({ query, async beginTransaction() {}, async commit() {}, async rollback() {}, release() {} }));
  const publisher = staff({ 'diet_plans.edit': false, 'diet_plans.publish': true });
  const response = await invoke(updatePlan, publisher, { published: false });
  assert.equal(response.error, undefined);
  assert.equal(response.result.published, false);
  assert.equal(writes.length, 1);
  const publishedResponse = await invoke(updatePlan, publisher, { published: true });
  assert.equal(publishedResponse.error, undefined);
  assert.equal(publishedResponse.result.published, true);
  assert.equal(writes.length, 2);
  for (const patch of [{ title: 'Not allowed' }, { published: true, title: 'Sneaked content' }, {}]) {
    assert.equal((await invoke(updatePlan, publisher, patch)).error?.status, 403);
  }
  assert.equal(writes.length, 2);
});

test('draft-only editing/deletion cannot race a concurrent publisher', async (t) => {
  let publishedAfterLookup = true;
  const activity = [];
  async function query(sql) {
    if (sql.includes('FROM plans p')) return [[{ id: 'record', client_id: 'client', dietitian_id: 'staff', published: false, week: '2026-09-21', week_end: '2026-09-27' }]];
    if (sql.includes('FROM plan_meals pm')) return [[]];
    if (sql === 'SELECT published FROM plans WHERE id = ? FOR UPDATE') { activity.push('locked-read'); return [[{ published: publishedAfterLookup }]]; }
    if (sql.startsWith('UPDATE plans SET title')) { activity.push('update'); return [{ affectedRows: 1 }]; }
    if (sql === 'DELETE FROM plans WHERE id = ? AND published = 0') { activity.push('conditional-delete'); return [{ affectedRows: publishedAfterLookup ? 0 : 1 }]; }
    throw new Error('Unexpected query in draft-race fixture');
  }
  t.mock.method(pool, 'query', query);
  t.mock.method(pool, 'getConnection', async () => ({ query,
    async beginTransaction() { activity.push('begin'); }, async commit() { activity.push('commit'); },
    async rollback() { activity.push('rollback'); }, release() { activity.push('release'); },
  }));
  await assert.rejects(updatePlanById('record', { title: 'Stale edit' }, { allowPublished: false }), (error) => error.status === 403);
  assert.deepEqual(activity, ['begin', 'locked-read', 'rollback', 'release']);
  await assert.rejects(deletePlanById('record', { allowPublished: false }), (error) => error.status === 409);
  publishedAfterLookup = false;
  activity.length = 0;
  await updatePlanById('record', { title: 'Still a draft' }, { allowPublished: false });
  assert.deepEqual(activity, ['begin', 'locked-read', 'update', 'commit', 'release']);
  await deletePlanById('record', { allowPublished: false });
  assert.equal(activity.at(-1), 'conditional-delete');
});

test('enquiry transitions cannot bypass client-creation/editing or call-management permissions', async (t) => {
  let converted = false;
  const writes = [];
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.startsWith('SELECT * FROM enquiries')) return [[{ id: 'record', company_id: 'company', converted_user_id: converted ? 'client' : null }]];
    writes.push(sql);
    throw new Error('Denied enquiry transition must stop before side effects');
  });
  t.mock.method(pool, 'getConnection', async () => { throw new Error('Denied enquiry transition must not open a transaction'); });
  assert.equal((await invoke(updateEnquiry, staff({ 'clients.create': false }), { status: 'converted' })).error?.status, 403);
  assert.equal((await invoke(updateEnquiry, staff({ 'program_plans.view': false }), { status: 'converted', planId: 'package' })).error?.status, 403);
  assert.equal((await invoke(updateEnquiry, staff({ 'calls.manage': false }), { status: 'follow-up' })).error?.status, 403);
  converted = true;
  for (const status of ['converted', 'closed']) assert.equal((await invoke(updateEnquiry, staff({ 'clients.edit': false }), { status })).error?.status, 403);
  assert.deepEqual(writes, []);
});

test('insights do not query or reveal data from modules the viewer cannot read', async (t) => {
  t.mock.method(pool, 'query', async () => { throw new Error('Disabled module must not be queried by insights'); });
  const hidden = { 'clients.view': false, 'staff.view': false, 'calls.view': false, 'enquiries.view': false, 'diet_plans.view': false };
  const admin = await invoke(adminOverview, staff(hidden));
  assert.equal(admin.error, undefined);
  assert.deepEqual(admin.result, { today: {} });
  const dietitian = await invoke(dietitianOverview, staff(hidden, 'dietitian'));
  assert.equal(dietitian.error, undefined);
  assert.deepEqual(dietitian.result, { stats: {} });
});

test('enquiry conversion and reactivation reject packages from another company before account writes', async (t) => {
  let converted = false;
  const writes = [], transactions = [];
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.startsWith('SELECT * FROM enquiries')) return [[{ id: 'record', company_id: 'company', converted_user_id: converted ? 'client' : null }]];
    writes.push(sql);
    throw new Error('Unexpected pool query during rejected conversion');
  });
  t.mock.method(pool, 'getConnection', async () => ({
    async beginTransaction() { transactions.push('begin'); },
    async commit() { transactions.push('commit'); },
    async rollback() { transactions.push('rollback'); }, release() { transactions.push('release'); },
    async query(sql, values) {
      if (sql.startsWith('SELECT * FROM program_plans WHERE id = ?')) return [values[0] === 'foreign' ? [{ id: 'foreign', company_id: 'another-company' }] : []];
      writes.push(sql);
      throw new Error('Foreign packages must not create or reactivate an account');
    },
  }));
  for (const wasConverted of [false, true]) {
    converted = wasConverted;
    for (const planId of ['foreign', 'missing']) {
      assert.equal((await invoke(updateEnquiry, staff(), { status: 'converted', planId })).error?.status, 400);
      assert.deepEqual(transactions.slice(-3), ['begin', 'rollback', 'release']);
    }
  }
  assert.deepEqual(writes, []);
});

test('messaging revocation rechecks persisted permissions on an existing stream', async () => {
  let allowed = true, permissionReads = 0;
  const user = { ...staff({}, 'dietitian'), passwordHash: 'synthetic-only', accountStatus: 'active' };
  const req = { user, authSession: { id: 'session', accountId: 'staff', companyId: 'company' }, accessTokenExpiresAt: 2000 };
  const guard = createLiveSessionGuard(req, { now: () => 1000, findUser: async () => user,
    findCompany: async () => ({ status: 'ACTIVE' }), sessionActive: async () => true,
    hydratePermissions: async (current) => { permissionReads++; return { ...current, permissionOverrides: { 'messages.use': allowed } }; },
  });
  assert.equal(await guard(), true);
  allowed = false;
  assert.equal(await guard(), false);
  assert.equal(permissionReads, 2, 'completed capability decisions are not cached');
});

test('call grants retain dietitian assignment and owning-host boundaries', async (t) => {
  const unexpected = [];
  t.mock.method(pool, 'query', async (sql, params) => {
    if (sql.includes('FROM users u')) return [[{ id: params[0], role: params[0] === 'client' ? 'client' : 'dietitian', company_id: 'company', assigned_dietitian_id: 'other-dietitian' }]];
    if (sql.includes('FROM calls c')) return [[{ id: 'record', client_id: 'client', dietitian_id: 'other-dietitian' }]];
    unexpected.push(sql);
    throw new Error('An unrelated dietitian must not mutate a call');
  });
  const dietitian = staff({}, 'dietitian');
  assert.equal((await invoke(createCall, dietitian, { client: 'client', scheduledAt: '2026-09-25T12:00:00Z' })).error?.status, 403);
  assert.equal((await invoke(deleteCall, dietitian)).error?.status, 403);
  assert.deepEqual(unexpected, []);
});
