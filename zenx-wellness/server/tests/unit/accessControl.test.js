import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/db/pool.js';
import {
  assertCanManagePermissions, hydrateUserPermissions, hydrateManyUserPermissions,
  validatePermissionMap, setUserPermissions, initializeMainAdmin,
  assertCanManageAccount, assignInitialPermissions, withAccountAccessTransaction,
} from '../../src/models/AccessControl.js';
import { getDefaultPermissions, getEffectivePermissions, hasPermission, PERMISSION_KEYS } from '../../../shared/permissions.js';

const companyId = 'company-1';
const account = (id, extras = {}) => ({ id, companyId, role: 'admin', accountStatus: 'active', ...extras });
const owner = account('owner', { isMainAdmin: true });
const manager = account('manager', { permissions: { 'permissions.manage': true } });
const staff = account('staff', { role: 'dietitian' });
const defaults = (role = 'admin', overrides = {}) => ({ ...getDefaultPermissions(role), ...overrides });
const allDenied = () => Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false]));
const denied = (status) => (error) => error.status === status;

test('role defaults retain existing access without automatically creating permission managers', () => {
  assert.equal(hasPermission(account('admin'), 'permissions.manage'), false);
  assert.equal(hasPermission(staff, 'contact.view_email'), true);
  assert.equal(hasPermission(staff, 'contact.view_phone'), true);
  assert.equal(hasPermission(staff, 'diet_plans.publish'), true);
  assert.equal(hasPermission(staff, 'clients.create'), false);
  assert.equal(hasPermission(staff, 'users.reset_password'), false);
  assert.equal(hasPermission({ ...staff, permissions: { 'staff.create_admin': true, 'permissions.manage': true } }, 'staff.create_admin'), false);
  assert.equal(hasPermission({ ...staff, isMainAdmin: true }, 'permissions.manage'), false);
  assert.equal(hasPermission(owner, 'unsupported.superuser'), false);
  assert.ok(Object.values(getEffectivePermissions({ ...owner, permissions: allDenied() })).every(Boolean));
});

test('viewing dependencies revoke downstream writes without granting missing prerequisites', () => {
  const permissionMap = getEffectivePermissions({ ...manager, permissions: { 'clients.view': false, 'diet_plans.publish': true, 'calls.manage': true } });
  for (const key of ['clients.edit', 'diet_plans.view', 'diet_plans.publish', 'calls.view', 'calls.manage', 'messages.use', 'reports.view', 'permissions.manage']) {
    assert.equal(permissionMap[key], false, key);
  }
  assert.equal(hasPermission(account('admin', { permissions: { 'contact.view_email': false, 'email_logs.view': true } }), 'email_logs.view'), false);
});

test('permission input requires the complete known boolean map and role-valid dependent grants', () => {
  const good = defaults('dietitian');
  assert.deepEqual(validatePermissionMap('dietitian', good), good);
  const missing = { ...good }; delete missing['contact.view_email'];
  for (const value of [null, [], false, {}, missing, { ...good, unknown: true }, { ...good, 'contact.view_email': 'false' },
    { ...good, 'staff.create_admin': true }, { ...good, 'diet_plans.view': false, 'diet_plans.edit': true }]) {
    assert.throws(() => validatePermissionMap('dietitian', value), denied(400));
  }
  assert.notEqual(validatePermissionMap('dietitian', good), good, 'caller data must not become persisted mutable state');
});

test('only the main admin may appoint or edit another manager; nobody edits themselves or another company', () => {
  const adminTarget = account('other-admin');
  assert.doesNotThrow(() => assertCanManagePermissions(owner, adminTarget, defaults('admin', { 'permissions.manage': true })));
  assert.doesNotThrow(() => assertCanManagePermissions(owner, manager, defaults()));
  for (const [actor, target, permissions, status] of [
    [owner, owner, defaults(), 403], [manager, owner, defaults(), 403],
    [manager, manager, defaults(), 403], [manager, account('other-manager', { permissions: { 'permissions.manage': true } }), defaults(), 403],
    [manager, adminTarget, defaults('admin', { 'permissions.manage': true }), 403],
    [owner, account('cross-company', { companyId: 'company-2' }), defaults(), 404],
    [owner, account('client', { role: 'client' }), allDenied(), 400],
    [staff, adminTarget, defaults(), 403], [account('ordinary-admin'), staff, defaults('dietitian'), 403],
  ]) assert.throws(() => assertCanManagePermissions(actor, target, permissions), denied(status));
});

test('delegated managers may restrict ordinary staff but cannot newly grant powers they lack', () => {
  const limited = { ...manager, permissions: { 'permissions.manage': true, 'diet_plans.publish': false } };
  const restricted = { ...staff, permissions: { 'diet_plans.publish': false } };
  assert.throws(() => assertCanManagePermissions(limited, restricted, defaults('dietitian')), denied(403));
  assert.doesNotThrow(() => assertCanManagePermissions(limited, staff, defaults('dietitian', { 'contact.view_phone': false })),
    'an unrelated edit can leave an already-existing higher grant unchanged');
  assert.doesNotThrow(() => assertCanManagePermissions(limited, staff, defaults('dietitian', { 'diet_plans.publish': false })));
});

test('account edits/password resets protect owner, permission managers and higher-privilege staff identities', () => {
  assert.doesNotThrow(() => assertCanManageAccount(owner, manager));
  assert.doesNotThrow(() => assertCanManageAccount(manager, staff));
  assert.doesNotThrow(() => assertCanManageAccount(staff, account('client', { role: 'client' })));
  for (const [actor, target, status] of [
    [owner, owner, 403], [manager, owner, 403], [manager, manager, 403],
    [manager, account('other-manager', { permissions: { 'permissions.manage': true } }), 403],
    [account('restricted', { permissions: { 'contact.view_email': false } }), staff, 403],
    [owner, account('outsider', { companyId: 'company-2' }), 404],
  ]) assert.throws(() => assertCanManageAccount(actor, target), denied(status));
});

test('new staff inherit no capabilities exceeding their creator and are never automatic permission managers', async () => {
  const writes = [];
  const conn = { query: async (sql, values) => { writes.push([sql, values]); return [{}]; } };
  const restricted = account('creator', { permissions: { 'permissions.manage': true, 'diet_plans.publish': false, 'contact.view_email': false } });
  await assignInitialPermissions(restricted, account('new-admin'), conn);
  const initial = JSON.parse(writes[0][1][2]);
  assert.equal(initial['permissions.manage'], false);
  assert.equal(initial['diet_plans.publish'], false);
  assert.equal(initial['contact.view_email'], false);
  assert.equal(initial['email_logs.view'], false);
  assert.equal(initial['clients.view'], true);
  assert.deepEqual(writes[0][1].slice(0, 2), ['new-admin', companyId]);
  assert.equal(writes[0][1][3], restricted.id);
  await assignInitialPermissions(owner, account('owner-created-admin'), conn);
  assert.equal(JSON.parse(writes[1][1][2])['permissions.manage'], false);
  await assignInitialPermissions(owner, account('new-client', { role: 'client' }), { query: () => assert.fail('clients do not get staff permissions') });
});

test('server hydration ignores spoofed owner/permission flags and scopes persisted data to the user company', async () => {
  const queries = [];
  const conn = { query: async (sql, values) => { queries.push([sql, values]); return [[{ main_admin_user_id: 'owner', permissions_json: JSON.stringify(defaults('admin', { 'contact.view_email': false })) }]]; } };
  const result = await hydrateUserPermissions(account('ordinary', { isMainAdmin: true, permissions: { 'permissions.manage': true } }), conn);
  assert.equal(result.isMainAdmin, false);
  assert.equal(result.permissions['permissions.manage'], false);
  assert.equal(result.permissions['contact.view_email'], false);
  assert.match(queries[0][0], /up\.company_id = u\.company_id/);
  assert.deepEqual(queries[0][1], ['ordinary', companyId]);
  const client = await hydrateUserPermissions(account('client', { role: 'client', isMainAdmin: true, permissions: defaults() }), { query: () => assert.fail('client needs no staff grant lookup') });
  assert.equal(client.isMainAdmin, false);
  assert.ok(Object.values(client.permissions).every((enabled) => !enabled));
});

test('malformed persisted permission values fail closed while absent legacy settings preserve defaults', async () => {
  for (const json of ['{bad-json', '[]', 'false', JSON.stringify({ unknown: true }), JSON.stringify({ 'clients.view': 'yes' })]) {
    const user = await hydrateUserPermissions(staff, { query: async () => [[{ main_admin_user_id: 'owner', permissions_json: json }]] });
    assert.ok(Object.values(user.permissions).every((enabled) => !enabled), json);
  }
  const legacy = await hydrateUserPermissions(staff, { query: async () => [[{ main_admin_user_id: null, permissions_json: null }]] });
  assert.deepEqual(legacy.permissions, getDefaultPermissions('dietitian'));
  assert.equal(legacy.permissionsConfigured, false);
  const batch = await hydrateManyUserPermissions([owner, staff], { query: async () => [[
    { id: 'owner', main_admin_user_id: 'owner', permissions_json: JSON.stringify(allDenied()) },
    { id: 'staff', main_admin_user_id: 'owner', permissions_json: JSON.stringify(defaults('dietitian', { 'contact.view_phone': false })) },
  ]] });
  assert.ok(Object.values(batch[0].permissions).every(Boolean));
  assert.equal(batch[1].permissions['contact.view_phone'], false);
});

function transactionFixture(t, options = {}) {
  const actorId = options.actorId ?? 'owner';
  const targetId = options.targetId ?? 'staff';
  const events = [];
  const writes = [];
  const queries = [];
  const actorRow = { id: actorId, role: 'admin', company_id: companyId, account_status: options.actorStatus ?? 'active' };
  const targetRow = { id: targetId, role: options.targetRole ?? 'dietitian', company_id: companyId, account_status: 'active' };
  const connection = {
    beginTransaction: async () => { events.push('begin'); },
    commit: async () => { events.push('commit'); },
    rollback: async () => { events.push('rollback'); },
    release: () => { events.push('release'); },
    query: async (sql, values) => {
      queries.push([sql, values]);
      if (/^SELECT id, company_id FROM users/.test(sql)) return [options.missingActor ? [] : [actorRow]];
      if (/^SELECT main_admin_user_id FROM company_access_control/.test(sql)) {
        assert.match(sql, /FOR UPDATE/);
        events.push('company-lock');
        return [options.missingControl ? [] : [{ main_admin_user_id: 'owner' }]];
      }
      if (/^SELECT id, role, company_id, account_status FROM users/.test(sql)) {
        assert.match(sql, /ORDER BY id FOR UPDATE/);
        assert.equal(values[2], companyId);
        events.push('user-locks');
        return [[actorRow, ...(options.missingTarget ? [] : [targetRow])]];
      }
      if (sql.includes('SELECT ac.main_admin_user_id')) {
        assert.ok(events.includes('company-lock'));
        assert.ok(events.includes('user-locks'));
        const isActor = values[0] === actorId;
        const isCurrentRead = /FOR UPDATE/.test(sql);
        let permissions = isActor ? options.actorPermissions : options.targetPermissions;
        if (isActor && options.currentActorPermissions) permissions = isCurrentRead ? options.currentActorPermissions : options.staleActorPermissions;
        if (!isActor && options.currentTargetPermissions) permissions = isCurrentRead ? options.currentTargetPermissions : options.staleTargetPermissions;
        return [[{ main_admin_user_id: 'owner', permissions_json: permissions ? JSON.stringify(permissions) : null }]];
      }
      if (/^(INSERT|UPDATE)/.test(sql)) {
        writes.push([sql, values]);
        if (options.failSql && sql.includes(options.failSql)) throw new Error('synthetic transaction failure');
        return [{ affectedRows: 1 }];
      }
      assert.fail(`Unexpected query: ${sql}`);
    },
  };
  t.mock.method(pool, 'getConnection', async () => connection);
  return { actorId, targetId, events, writes, queries };
}

test('permission update atomically persists the map, audits before/after and revokes only target sessions', async (t) => {
  const fixture = transactionFixture(t);
  const desired = defaults('dietitian', { 'contact.view_email': false });
  assert.equal(await setUserPermissions(fixture.actorId, fixture.targetId, desired), fixture.targetId);
  assert.deepEqual(fixture.events, ['begin', 'company-lock', 'user-locks', 'commit', 'release']);
  assert.equal(fixture.writes.length, 3);
  const [permissionWrite, auditWrite, revocationWrite] = fixture.writes;
  assert.match(permissionWrite[0], /INSERT INTO user_permissions/);
  assert.deepEqual(permissionWrite[1].slice(0, 2), [fixture.targetId, companyId]);
  assert.deepEqual(JSON.parse(permissionWrite[1][2]), desired);
  assert.equal(permissionWrite[1][3], fixture.actorId);
  assert.match(auditWrite[0], /INSERT INTO permission_audit/);
  assert.deepEqual(JSON.parse(auditWrite[1][5]), { before: getDefaultPermissions('dietitian'), after: desired });
  assert.match(revocationWrite[0], /account_kind = 'wellness'.*account_id = \?/);
  assert.deepEqual(revocationWrite[1], [fixture.targetId]);
});

test('a just-revoked manager cannot reuse a stale REPEATABLE READ snapshot after waiting for the company lock', async (t) => {
  const fixture = transactionFixture(t, { actorId: 'manager',
    staleActorPermissions: defaults('admin', { 'permissions.manage': true }),
    currentActorPermissions: defaults('admin', { 'permissions.manage': false }),
  });
  await assert.rejects(setUserPermissions(fixture.actorId, fixture.targetId, defaults('dietitian')), denied(403));
  assert.equal(fixture.writes.length, 0);
  assert.deepEqual(fixture.events.slice(-2), ['rollback', 'release']);
});

test('a newly promoted target is protected from delegated changes using a stale target snapshot', async (t) => {
  const fixture = transactionFixture(t, { actorId: 'manager', targetId: 'other-admin', targetRole: 'admin',
    actorPermissions: defaults('admin', { 'permissions.manage': true }),
    staleTargetPermissions: defaults('admin'), currentTargetPermissions: defaults('admin', { 'permissions.manage': true }),
  });
  await assert.rejects(setUserPermissions(fixture.actorId, fixture.targetId, defaults('admin')), denied(403));
  assert.equal(fixture.writes.length, 0);
  assert.deepEqual(fixture.events.slice(-2), ['rollback', 'release']);
});

for (const [name, options, status] of [
  ['missing main-admin configuration', { missingControl: true }, 409],
  ['missing actor', { missingActor: true }, 403],
  ['missing/cross-company target', { missingTarget: true }, 404],
  ['suspended actor', { actorStatus: 'suspended' }, 403],
]) test(`permission update denies ${name} without writes and always releases the connection`, async (t) => {
  const fixture = transactionFixture(t, options);
  await assert.rejects(setUserPermissions(fixture.actorId, fixture.targetId, defaults('dietitian')), denied(status));
  assert.equal(fixture.writes.length, 0);
  assert.deepEqual(fixture.events.slice(-2), ['rollback', 'release']);
});

for (const failSql of ['INSERT INTO permission_audit', 'UPDATE auth_sessions']) {
  test(`failure at ${failSql} rolls back the entire permission change`, async (t) => {
    const fixture = transactionFixture(t, { failSql });
    await assert.rejects(setUserPermissions(fixture.actorId, fixture.targetId, defaults('dietitian')), /synthetic transaction failure/);
    assert.equal(fixture.events.includes('commit'), false);
    assert.deepEqual(fixture.events.slice(-2), ['rollback', 'release']);
  });
}

test('operator owner initialization selects only an active admin inside the company and records an audit', async () => {
  const writes = [];
  const conn = { query: async (sql, values) => {
    if (sql.startsWith('SELECT id FROM users')) {
      assert.match(sql, /company_id = \?.*role = 'admin'.*account_status = 'active'/);
      assert.deepEqual(values, ['owner', companyId]); return [[{ id: 'owner' }]];
    }
    if (sql.startsWith('SELECT company_id')) return [[]];
    writes.push([sql, values]); return [{ affectedRows: 1 }];
  } };
  assert.equal(await initializeMainAdmin({ companyId, userId: 'owner' }, conn), true);
  assert.match(writes[0][0], /INSERT INTO company_access_control/);
  assert.deepEqual(writes[0][1], [companyId, 'owner']);
  assert.match(writes[1][0], /INSERT INTO permission_audit/);
  assert.equal(writes[1][1][3], 'main_admin_initialized');
});

test('operator initialization is idempotent for the owner and cannot transfer ownership or select a non-admin', async () => {
  let eligible = true;
  const conn = { query: async (sql) => {
    if (sql.startsWith('SELECT id FROM users')) return [eligible ? [{ id: 'candidate' }] : []];
    if (sql.startsWith('SELECT company_id')) return [[{ company_id: companyId, main_admin_user_id: 'owner' }]];
    assert.fail('Owner must not be overwritten or audited twice');
  } };
  assert.equal(await initializeMainAdmin({ companyId, userId: 'owner' }, conn), false);
  await assert.rejects(initializeMainAdmin({ companyId, userId: 'other-admin' }, conn), denied(409));
  eligible = false;
  await assert.rejects(initializeMainAdmin({ companyId, userId: 'client' }, conn), denied(400));
});

function accountTransactionFixture(t, options = {}) {
  const events = [];
  const actorRow = { id: 'actor', company_id: companyId, role: 'admin', account_status: options.actorStatus ?? 'active', email: 'fresh-actor@example.test' };
  const targetRow = { id: 'target', company_id: companyId, role: 'client', account_status: 'active', assigned_dietitian_id: 'assigned-1', email: 'fresh-client@example.test' };
  const connection = {
    beginTransaction: async () => { events.push('begin'); }, commit: async () => { events.push('commit'); },
    rollback: async () => { events.push('rollback'); }, release: () => { events.push('release'); },
    query: async (sql, values) => {
      if (sql.startsWith('SELECT id, company_id FROM users')) return [options.missingActor ? [] : [actorRow]];
      if (sql.startsWith('SELECT main_admin_user_id FROM company_access_control')) {
        assert.match(sql, /FOR UPDATE/); events.push('company-lock');
        return [options.unconfigured ? [] : [{ main_admin_user_id: 'owner' }]];
      }
      if (sql.startsWith('SELECT id FROM users WHERE id IN')) {
        assert.match(sql, /ORDER BY id FOR UPDATE/);
        assert.equal(values.at(-1), companyId);
        assert.deepEqual(values.slice(0, -1), [...values.slice(0, -1)].sort());
        events.push('user-locks');
        return [[actorRow, ...(options.missingTarget ? [] : [targetRow])]];
      }
      if (sql.includes('SELECT u.*')) {
        assert.match(sql, /FOR UPDATE$/);
        assert.ok(events.includes('user-locks'));
        return [[values[0] === actorRow.id ? actorRow : targetRow]];
      }
      if (sql.includes('SELECT ac.main_admin_user_id')) {
        assert.match(sql, /FOR UPDATE$/, 'permission recheck must not use the earlier consistent-read snapshot');
        return [[{ main_admin_user_id: options.unconfigured ? null : 'owner', permissions_json: JSON.stringify(defaults('admin', { 'users.reset_password': false })) }]];
      }
      assert.fail(`Unexpected query: ${sql}`);
    },
  };
  t.mock.method(pool, 'getConnection', async () => connection);
  return { events, connection };
}

test('account mutation helper supplies full current mapped users and current permissions under ordered locks', async (t) => {
  const fixture = accountTransactionFixture(t);
  const result = await withAccountAccessTransaction('actor', 'target', async ({ actor, target, conn }) => {
    assert.equal(conn, fixture.connection);
    assert.equal(actor.email, 'fresh-actor@example.test');
    assert.equal(actor.permissions['users.reset_password'], false, 'caller must decide using refreshed grants');
    assert.equal(target.email, 'fresh-client@example.test');
    assert.equal(target.assignedDietitian, 'assigned-1');
    assert.equal(target.companyId, companyId);
    return 'mutation-result';
  });
  assert.equal(result, 'mutation-result');
  assert.deepEqual(fixture.events, ['begin', 'company-lock', 'user-locks', 'commit', 'release']);
});

test('account creation helper allows legacy unconfigured companies without inventing an owner', async (t) => {
  const fixture = accountTransactionFixture(t, { unconfigured: true });
  await withAccountAccessTransaction('actor', null, async ({ actor, target }) => {
    assert.equal(target, null);
    assert.equal(actor.isMainAdmin, false);
    assert.equal(actor.permissionsConfigured, false);
  });
  assert.deepEqual(fixture.events.slice(-2), ['commit', 'release']);
});

for (const [name, options, status] of [
  ['missing actor', { missingActor: true }, 403],
  ['inactive actor', { actorStatus: 'inactive' }, 403],
  ['suspended actor', { actorStatus: 'suspended' }, 403],
  ['missing/cross-company target', { missingTarget: true }, 404],
]) test(`account mutation helper denies ${name} before invoking a write callback`, async (t) => {
  const fixture = accountTransactionFixture(t, options);
  await assert.rejects(withAccountAccessTransaction('actor', 'target', () => assert.fail('must not mutate')), denied(status));
  assert.equal(fixture.events.includes('commit'), false);
  assert.deepEqual(fixture.events.slice(-2), ['rollback', 'release']);
});

test('account mutation callback denial rolls back and releases the transaction', async (t) => {
  const fixture = accountTransactionFixture(t);
  await assert.rejects(withAccountAccessTransaction('actor', 'target', () => { throw new Error('synthetic policy denial'); }), /synthetic policy denial/);
  assert.equal(fixture.events.includes('commit'), false);
  assert.deepEqual(fixture.events.slice(-2), ['rollback', 'release']);
});
