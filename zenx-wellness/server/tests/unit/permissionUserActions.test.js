import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/db/pool.js';
import { createUser, updateUser, resetUserPassword, listDietitianOptions } from '../../src/controllers/user.controller.js';
import { getEffectivePermissions } from '../../../shared/permissions.js';

const password = 'Synthetic-test-only-908!';
function fixture(t, { owner = 'owner' } = {}) {
  const users = new Map();
  const overrides = new Map();
  const programs = new Map([
    ['package', { id: 'package', company_id: 'company', name: 'Local package', active: true }],
    ['foreign-package', { id: 'foreign-package', company_id: 'foreign-company', name: 'Foreign package', active: true }],
  ]);
  const writes = [], events = [], queries = [], emails = new Map();
  let snapshot, active = false;
  const add = (id, role = 'admin', permissions = {}, extra = {}) => {
    users.set(id, { id, name: `Fixture ${id}`, role, company_id: 'company', company_slug: 'fixture',
      account_status: 'active', password_hash: 'synthetic-old-hash', email: `${id}@example.invalid`, ...extra });
    overrides.set(id, permissions);
  };
  for (const id of ['owner', 'admin', 'manager', 'peer']) add(id);
  overrides.set('manager', { 'permissions.manage': true });
  add('dietitian', 'dietitian');
  add('client', 'client', {}, { assigned_dietitian_id: 'dietitian' });
  add('other-client', 'client', {}, { assigned_dietitian_id: 'other-dietitian' });
  add('foreign', 'client', {}, { company_id: 'foreign-company' });
  async function query(sql, values = [], source = 'pool') {
    queries.push({ sql, values, source });
    if (sql.startsWith('SELECT id, company_id FROM users WHERE id = ?')) return [[users.get(values[0])].filter(Boolean)];
    if (sql.startsWith('SELECT main_admin_user_id FROM company_access_control')) {
      assert.ok(active); assert.match(sql, /FOR UPDATE/); events.push('company-lock');
      return [owner ? [{ main_admin_user_id: owner }] : []];
    }
    if (sql.startsWith('SELECT id FROM users WHERE id IN')) {
      assert.ok(events.includes('company-lock')); assert.match(sql, /ORDER BY id FOR UPDATE/);
      events.push('user-locks');
      return [[...new Set(values.slice(0, -1))].map((id) => users.get(id)).filter((row) => row?.company_id === values.at(-1))];
    }
    if (sql.includes('SELECT ac.main_admin_user_id')) {
      if (sql.includes('FOR UPDATE')) { assert.ok(events.includes('user-locks')); events.push('current-permissions'); }
      return [[{ main_admin_user_id: owner, permissions_json: JSON.stringify(overrides.get(values[0]) ?? {}) }]];
    }
    if (sql.includes('FROM users u') && sql.includes('WHERE u.id = ?')) return [[users.get(values[0])].filter(Boolean)];
    if (sql.includes('FROM users u') && sql.includes('WHERE u.company_id = ?')) {
      assert.match(sql, /u.role = \?/);
      return [[...users.values()].filter((row) => row.company_id === values[0] && row.role === values[1])];
    }
    if (sql.startsWith('SELECT * FROM program_plans WHERE id = ?')) {
      assert.equal(source, 'transaction', 'package validation belongs to the authorized account transaction');
      return [[programs.get(values[0])].filter(Boolean)];
    }
    if (sql.includes('FROM users WHERE LOWER(email)')) return [[...users.values()].find((row) => row.email === values[0])].map((rows) => rows ? [rows] : []);
    if (sql.includes('FROM companies')) return [[{ id: 'company', name: 'Fixture company', slug: 'fixture', status: 'ACTIVE' }]];
    if (sql.startsWith('INSERT INTO email_log')) {
      assert.equal(active, false, 'welcome delivery must be queued only after the account transaction commits');
      emails.set(values[0], { id: values[0], to_email: values[2], template_key: values[3], params: JSON.parse(values[5]) });
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('SELECT * FROM email_log WHERE id')) return [[emails.get(values[0])].filter(Boolean)];
    if (/^(INSERT|UPDATE)/.test(sql)) {
      assert.equal(source, 'transaction', 'every account/permission/credential mutation must use the locked transaction');
      assert.equal(active, true);
      writes.push({ sql, values });
      if (sql.startsWith('INSERT INTO users ')) {
        const columns = sql.match(/INSERT INTO users \(([^)]+)\)/)[1].split(', ');
        const row = Object.fromEntries(columns.map((key, index) => [key, values[index]]));
        users.set(row.id, { account_status: 'active', ...row });
      } else if (sql.startsWith('INSERT INTO user_permissions')) {
        overrides.set(values[0], JSON.parse(values[2]));
      } else if (sql.startsWith('UPDATE users SET ')) {
        const row = users.get(values.at(-1));
        const sets = sql.slice('UPDATE users SET '.length).split(' WHERE ')[0].split(', ');
        let index = 0;
        for (const assignment of sets) {
          const [key, value] = assignment.split(' = ');
          if (value === '?') row[key] = values[index++];
          else if (key === 'refresh_token_version') row[key] = (row[key] ?? 0) + 1;
        }
      }
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected SQL in account-permission fixture: ${sql}`);
  }
  const conn = {
    query: (sql, values) => query(sql, values, 'transaction'),
    execute: async () => { throw new Error('Unexpected execute in account fixture'); },
    async beginTransaction() { assert.equal(active, false); active = true; snapshot = structuredClone([...users]); events.push('begin'); },
    async commit() { active = false; events.push('commit'); },
    async rollback() { active = false; users.clear(); for (const [id, row] of snapshot) users.set(id, row); events.push('rollback'); },
    release() { events.push('release'); },
  };
  t.mock.method(pool, 'query', (sql, values) => query(sql, values));
  t.mock.method(pool, 'execute', async () => { throw new Error('Unexpected pool execute in account fixture'); });
  t.mock.method(pool, 'getConnection', async () => conn);
  function viewer(id, extra = {}) {
    const row = users.get(id);
    const user = { id, role: row.role, companyId: row.company_id, companySlug: row.company_slug,
      isMainAdmin: id === owner && row.role === 'admin', permissionOverrides: overrides.get(id), ...extra };
    return { ...user, permissions: getEffectivePermissions(user) };
  }
  async function invoke(controller, actor, body = {}, target = 'client', viewerPatch = {}, query = {}) {
    let error, result, status = 200;
    const res = { status(value) { status = value; return this; }, json(value) { result = value; return this; } };
    await controller({ user: viewer(actor, viewerPatch), body, params: { id: target }, query }, res, (value) => { error = value; });
    return { error, result, status };
  }
  return { add, users, overrides, writes, events, queries, emails, invoke };
}

test('create controls distinguish client, dietitian and admin grants and keep dietitian defaults restrictive', async (t) => {
  const f = fixture(t);
  for (const [role, key] of [['client', 'clients.create'], ['dietitian', 'staff.create_dietitian'], ['admin', 'staff.create_admin']]) {
    f.overrides.set('admin', { [key]: false });
    const response = await f.invoke(createUser, 'admin', { role, name: 'Synthetic new user', email: 'new@example.invalid', password });
    assert.equal(response.error?.status, 403);
  }
  assert.equal((await f.invoke(createUser, 'dietitian', { role: 'client', email: 'new@example.invalid', password })).error?.status, 403);
  assert.equal((await f.invoke(resetUserPassword, 'dietitian', { password })).error?.status, 403);
  assert.deepEqual(f.writes, []);
  assert.deepEqual(f.events, []);
});

test('granted dietitian client creation auto-assigns self and cannot create staff or assign another dietitian', async (t) => {
  const f = fixture(t);
  f.overrides.set('dietitian', { 'clients.create': true });
  const body = { name: 'Synthetic client', role: 'client', email: 'new@example.invalid', password };
  for (const extra of [{ assignedDietitian: 'other-dietitian' }, { role: 'dietitian' }, { role: 'admin' }]) {
    assert.equal((await f.invoke(createUser, 'dietitian', { ...body, ...extra })).error?.status, 403);
  }
  assert.equal(f.writes.length, 0);
  const response = await f.invoke(createUser, 'dietitian', body);
  assert.equal(response.error, undefined);
  assert.equal(response.status, 201);
  assert.equal(response.result.assignedDietitian, 'dietitian');
  assert.equal(response.result.companyId, 'company');
  assert.equal(response.result.mustChangePassword, true);
  assert.equal(response.result.passwordHash, undefined);
  assert.equal(f.emails.size, 1);
  assert.equal(f.writes.some(({ sql }) => sql.includes('user_permissions')), false, 'clients never acquire staff capabilities');
});

test('new staff permissions are capped at the creator permissions and cannot automatically delegate management', async (t) => {
  const f = fixture(t);
  f.overrides.set('admin', { 'contact.view_email': false, 'diet_plans.publish': false, 'permissions.manage': true });
  const response = await f.invoke(createUser, 'admin', { name: 'New administrator', role: 'admin', email: 'new-admin@example.invalid', password });
  assert.equal(response.error, undefined);
  const permissions = response.result.permissions;
  assert.equal(permissions['contact.view_email'], false);
  assert.equal(permissions['email_logs.view'], false);
  assert.equal(permissions['diet_plans.publish'], false);
  assert.equal(permissions['permissions.manage'], false);
  assert.equal(permissions['clients.view'], true);
  assert.equal(response.result.isMainAdmin, false);
  assert.equal(f.writes.filter(({ sql }) => sql.startsWith('INSERT INTO user_permissions')).length, 1);
});

test('restricted admins cannot edit or reset main admins, managers, higher-capability peers or foreign users', async (t) => {
  const f = fixture(t);
  f.overrides.set('admin', { 'diet_plans.publish': false });
  for (const [target, expected] of [['owner', 403], ['manager', 403], ['peer', 403], ['foreign', 404]]) {
    assert.equal((await f.invoke(updateUser, 'admin', { name: 'Forbidden takeover' }, target)).error?.status, expected);
    assert.equal((await f.invoke(resetUserPassword, 'admin', { password }, target)).error?.status, expected);
  }
  assert.equal((await f.invoke(resetUserPassword, 'admin', { password }, 'admin')).error?.status, 400);
  assert.equal((await f.invoke(updateUser, 'admin', { name: 'Self override' }, 'admin')).error?.status, 403);
  assert.deepEqual(f.writes, []);
});

test('contact-hidden staff cannot modify hidden contact fields and dietitian editing stays assigned-client scoped', async (t) => {
  const f = fixture(t);
  f.overrides.set('dietitian', { 'contact.view_email': false, 'contact.view_phone': false });
  for (const body of [{ email: 'hidden@example.invalid' }, { phone: '+1 555 010 0200' }]) {
    assert.equal((await f.invoke(updateUser, 'dietitian', body)).error?.status, 403);
  }
  assert.equal((await f.invoke(updateUser, 'dietitian', { allergies: 'Synthetic note' }, 'other-client')).error?.status, 403);
  assert.equal((await f.invoke(updateUser, 'dietitian', { role: 'admin' })).error?.status, 403);
  assert.equal((await f.invoke(updateUser, 'dietitian', { accountStatus: 'suspended' })).error?.status, 403);
  assert.equal(f.writes.length, 0);
  const allowed = await f.invoke(updateUser, 'dietitian', { allergies: 'Synthetic note' });
  assert.equal(allowed.error, undefined);
  assert.equal(allowed.result.allergies, 'Synthetic note');
});

test('granted dietitian reset applies only to assigned clients and atomically retires sessions and old setup links', async (t) => {
  const f = fixture(t);
  f.overrides.set('dietitian', { 'users.reset_password': true });
  for (const target of ['other-client', 'admin']) assert.equal((await f.invoke(resetUserPassword, 'dietitian', { password }, target)).error?.status, 403);
  assert.equal(f.writes.length, 0);
  const response = await f.invoke(resetUserPassword, 'dietitian', { password });
  assert.equal(response.error, undefined);
  assert.deepEqual(response.result, { ok: true });
  assert.equal(f.users.get('client').must_change_password, true);
  assert.match(f.users.get('client').password_hash, /^\$2[aby]\$12\$/);
  assert.ok(f.writes.some(({ sql }) => sql.startsWith('UPDATE password_reset_tokens')));
  assert.ok(f.writes.some(({ sql, values }) => sql.startsWith('UPDATE auth_sessions') && values[1] === 'client'));
  assert.deepEqual(f.events.slice(-2), ['commit', 'release']);
});

test('stale request permissions cannot authorize account writes after revocation or target promotion', async (t) => {
  const f = fixture(t);
  f.overrides.set('admin', { 'clients.edit': false, 'clients.create': false, 'users.reset_password': false });
  const stale = { permissionOverrides: {} };
  assert.equal((await f.invoke(updateUser, 'admin', { name: 'Revoked edit' }, 'client', stale)).error?.status, 403);
  assert.equal((await f.invoke(createUser, 'admin', { role: 'client', name: 'Revoked create', email: 'stale@example.invalid', password }, 'client', stale)).error?.status, 403);
  assert.equal((await f.invoke(resetUserPassword, 'admin', { password }, 'client', stale)).error?.status, 403);
  f.overrides.set('admin', {});
  f.overrides.set('peer', { 'permissions.manage': true });
  assert.equal((await f.invoke(updateUser, 'admin', { name: 'Promoted target' }, 'peer')).error?.status, 403);
  assert.deepEqual(f.writes, []);
  assert.ok(f.queries.filter(({ sql }) => sql.includes('SELECT ac.main_admin_user_id') && sql.includes('FOR UPDATE')).length >= 4);
});

test('the main admin retains management of protected staff and reset permissions', async (t) => {
  const f = fixture(t);
  const updated = await f.invoke(updateUser, 'owner', { name: 'Updated manager' }, 'manager');
  assert.equal(updated.error, undefined);
  assert.equal(updated.result.name, 'Updated manager');
  const reset = await f.invoke(resetUserPassword, 'owner', { password }, 'manager');
  assert.equal(reset.error, undefined);
  assert.deepEqual(reset.result, { ok: true });
});

test('legacy defaults still allow normal client management without silently appointing an owner', async (t) => {
  const f = fixture(t, { owner: null });
  const response = await f.invoke(updateUser, 'admin', { name: 'Updated legacy client' });
  assert.equal(response.error, undefined);
  assert.equal(response.result.name, 'Updated legacy client');
  assert.equal(response.result.isMainAdmin, false);
});

test('hidden program packages cannot be assigned, extended or cleared but bare-client creation stays allowed', async (t) => {
  const f = fixture(t);
  f.overrides.set('admin', { 'program_plans.view': false });
  for (const patch of [{ programPlan: 'package' }, { programPlan: null }, { planDuration: '1 month' }, { planDuration: null }]) {
    assert.equal((await f.invoke(updateUser, 'admin', patch)).error?.status, 403);
  }
  const body = { name: 'Synthetic client', role: 'client', email: 'bare@example.invalid', password };
  for (const extra of [{ programPlan: 'package' }, { planDuration: '1 month' }]) {
    assert.equal((await f.invoke(createUser, 'admin', { ...body, ...extra })).error?.status, 403);
  }
  assert.equal(f.writes.length, 0);
  assert.equal(f.queries.some(({ sql }) => sql.startsWith('SELECT * FROM program_plans')), false, 'denied actors must not inspect package records');
  const bare = await f.invoke(createUser, 'admin', { ...body, programPlan: null, planDuration: null });
  assert.equal(bare.error, undefined);
  assert.equal(bare.status, 201);
  assert.equal(bare.result.programPlan, null);
});

test('program assignment validates company ownership for creation and edits inside the account transaction', async (t) => {
  const f = fixture(t);
  for (const programPlan of ['foreign-package', 'missing-package']) {
    assert.equal((await f.invoke(updateUser, 'admin', { programPlan })).error?.status, 400);
    assert.equal((await f.invoke(createUser, 'admin', { name: 'Rejected client', role: 'client', email: 'package@example.invalid', password, programPlan })).error?.status, 400);
  }
  assert.equal(f.writes.length, 0);
  const updated = await f.invoke(updateUser, 'admin', { programPlan: 'package', planDuration: '1 month' });
  assert.equal(updated.error, undefined);
  assert.equal(updated.result.programPlan, 'package');
  const created = await f.invoke(createUser, 'admin', { name: 'Packaged client', role: 'client', email: 'package@example.invalid', password, programPlan: 'package', planDuration: '1 month' });
  assert.equal(created.error, undefined);
  assert.equal(created.result.programPlan, 'package');
  assert.equal(created.result.planDuration, '1 month');
  const cleared = await f.invoke(updateUser, 'admin', { programPlan: null, planDuration: null });
  assert.equal(cleared.error, undefined);
  assert.equal(cleared.result.programPlan, null);
});

test('minimal dietitian options expose no contacts or permissions and enforce company and dietitian-self scope', async (t) => {
  const f = fixture(t);
  f.add('other-dietitian', 'dietitian', {}, { phone: '+1 555 010 0000', address: 'Private fixture', qualifications: 'Private qualifications' });
  f.add('foreign-dietitian', 'dietitian', {}, { company_id: 'foreign-company', phone: '+1 555 010 1111' });
  f.overrides.set('admin', { 'staff.view': false, 'contact.view_email': false, 'contact.view_phone': false });
  const admin = await f.invoke(listDietitianOptions, 'admin', {}, 'unused', {}, { companyId: 'foreign-company' });
  assert.equal(admin.error, undefined);
  assert.deepEqual(admin.result.map((user) => user._id), ['dietitian', 'other-dietitian']);
  for (const user of admin.result) {
    assert.deepEqual(Object.keys(user).sort(), ['_id', 'accountStatus', 'name', 'role', 'timezone']);
    for (const key of ['email', 'phone', 'passwordHash', 'address', 'qualifications', 'companyId', 'permissions', 'permissionOverrides']) assert.equal(user[key], undefined);
  }
  const dietitian = await f.invoke(listDietitianOptions, 'dietitian');
  assert.equal(dietitian.error, undefined);
  assert.deepEqual(dietitian.result.map((user) => user._id), ['dietitian']);
  const client = await f.invoke(listDietitianOptions, 'client');
  assert.equal(client.error, undefined);
  assert.deepEqual(client.result.map((user) => user._id), ['dietitian', 'other-dietitian']);
  f.overrides.set('admin', { 'staff.view': false, 'clients.view': false });
  const before = f.queries.length;
  assert.equal((await f.invoke(listDietitianOptions, 'admin')).error?.status, 403);
  assert.equal(f.queries.length, before, 'no permitted selector use means no directory query');
});
