import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../../src/db/pool.js';
import { env } from '../../src/config/env.js';
import { handoff } from '../../src/controllers/auth.controller.js';
import { hasZenxOwnerProof, initializeZenxMainAdmin } from '../../src/models/ZenxMainAdmin.js';
import { hydrateUserPermissions } from '../../src/models/AccessControl.js';
import { linkZenxUser } from '../../src/models/User.js';
import { createSession } from '../../src/models/AuthSession.js';
import { verifyRefreshToken } from '../../src/utils/jwt.js';
import { PERMISSION_KEYS } from '../../../shared/permissions.js';

const companyId = 'company-a';
const ownerId = 'local-owner';
const zenxId = 'zenx-owner';
const allDenied = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false]));
const digest = (value) => createHash('sha256').update(value).digest('hex');
const proof = (patch = {}) => ({
  sub: zenxId, main_admin_user_id: zenxId, role: 'wellness_admin',
  iss: 'zenx-admin', aud: 'zenx-dietitian', company_id: companyId,
  company_slug: 'company-a', email: 'owner@example.test', jti: randomUUID(), ...patch,
});
const owner = (patch = {}) => ({
  id: ownerId, role: 'admin', accountStatus: 'active', companyId,
  zenxUserId: zenxId, ...patch,
});

// All persistence is in memory, and unmatched queries fail immediately. Keep the
// transaction's pending state separate so a rollback cannot masquerade as success.
function fixture(t, options = {}) {
  const previousSecret = env.zenxHandoffSecret;
  env.zenxHandoffSecret = 'unit-test-zenx-owner-handoff-secret';
  t.after(() => { env.zenxHandoffSecret = previousSecret; });
  const events = [];
  const queries = [];
  const row = {
    id: ownerId, role: 'admin', account_status: 'active', company_id: companyId,
    company_slug: 'company-a', zenx_user_id: zenxId, email: 'owner@example.test',
    password_hash: 'stored-password-hash', refresh_token_version: 0, ...options.user,
  };
  const company = { id: companyId, slug: 'company-a', status: 'ACTIVE', ...options.company };
  let committed = { control: options.existingOwner ? { company_id: company.id, main_admin_user_id: options.existingOwner } : null, audits: [], sessions: [] };
  let pending;
  let remainingCommitFailures = options.commitFailures ?? 0;

  async function query(sql, values = [], inTransaction = false) {
    queries.push({ sql, values, inTransaction });
    const state = inTransaction ? pending : committed;
    if (inTransaction) assert.ok(state, 'transaction queries need an active transaction');
    if (sql.includes('SELECT ac.main_admin_user_id')) {
      assert.deepEqual(values, [row.id, row.company_id]);
      return [[{ main_admin_user_id: state.control?.main_admin_user_id, permissions_json: JSON.stringify(allDenied) }]];
    }
    if (sql.startsWith('SELECT main_admin_user_id FROM company_access_control')) {
      assert.equal(inTransaction, true);
      assert.match(sql, /FOR UPDATE/);
      assert.deepEqual(values, [company.id]);
      events.push('control-lock');
      return [state.control ? [state.control] : []];
    }
    if (sql.startsWith('SELECT id, status FROM companies')) {
      assert.equal(inTransaction, true);
      assert.match(sql, /FOR UPDATE/);
      events.push('company-lock');
      return [options.missingLockedCompany ? [] : [{ ...company, ...options.lockedCompany }]];
    }
    if (sql.startsWith('SELECT id, company_id, zenx_user_id, role, account_status FROM users')) {
      assert.equal(inTransaction, true);
      assert.match(sql, /FOR UPDATE/);
      assert.deepEqual(values, [row.id]);
      events.push('user-lock');
      return [options.missingLockedUser ? [] : [{ ...row, ...options.lockedUser }]];
    }
    if (sql.startsWith('INSERT INTO company_access_control')) {
      assert.equal(inTransaction, true, 'owner write must share the session transaction');
      assert.equal(state.control, null, 'existing ownership must never be overwritten');
      events.push('owner-write');
      state.control = { company_id: values[0], main_admin_user_id: values[1] };
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('INSERT INTO permission_audit')) {
      assert.equal(inTransaction, true);
      events.push('audit-write');
      if (options.failAudit) throw new Error('synthetic audit failure');
      state.audits.push(values);
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('INSERT INTO auth_sessions')) {
      assert.equal(inTransaction, true, 'session consumption must share the owner transaction');
      events.push('session-write');
      if (state.sessions.some((session) => session[0] === values[0])) {
        throw Object.assign(new Error('duplicate session'), { code: 'ER_DUP_ENTRY' });
      }
      state.sessions.push(values);
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('SELECT id FROM companies WHERE id')) return [values[0] === company.id ? [{ id: company.id }] : []];
    if (sql.startsWith('SELECT id FROM companies WHERE slug')) return [[{ id: company.id }]];
    if (sql.includes('FROM companies WHERE id')) return [[company]];
    if (sql.startsWith('UPDATE companies SET') || sql.startsWith('UPDATE users SET last_login')) return [{ affectedRows: 1 }];
    if (sql.startsWith('SELECT * FROM users WHERE zenx_user_id')) return [row.zenx_user_id === values[0] ? [{ ...row }] : []];
    if (sql.includes('FROM users WHERE LOWER(email)')) return [row.email === values[0] ? [{ ...row }] : []];
    if (sql.startsWith('UPDATE users SET zenx_user_id')) {
      assert.match(sql, /WHERE id = \? AND company_id = \? AND role = \? AND \(zenx_user_id IS NULL OR zenx_user_id = \?\)/);
      const [next, id, scopedCompany, role, sameIdentity] = values;
      assert.equal(next, sameIdentity);
      if (options.concurrentLink) row.zenx_user_id = options.concurrentLink;
      const permitted = row.id === id && row.company_id === scopedCompany && row.role === role
        && (row.zenx_user_id == null || row.zenx_user_id === next);
      if (permitted) row.zenx_user_id = next;
      return [{ affectedRows: permitted ? 1 : 0 }];
    }
    if (sql.includes('FROM users u') && sql.includes('WHERE u.id = ?')) return [[{ ...row }]];
    assert.fail(`Unexpected mocked query: ${sql}`);
  }
  const conn = {
    beginTransaction: async () => { events.push('begin'); pending = structuredClone(committed); },
    query: (sql, values) => query(sql, values, true),
    commit: async () => {
      if (remainingCommitFailures-- > 0) {
        events.push('commit-failure');
        throw Object.assign(new Error('synthetic commit failure'), { code: options.commitErrorCode });
      }
      events.push('commit'); committed = pending; pending = undefined;
    },
    rollback: async () => { events.push('rollback'); pending = undefined; },
    release: () => { events.push('release'); },
  };
  t.mock.method(pool, 'query', (sql, values) => query(sql, values));
  t.mock.method(pool, 'getConnection', async () => conn);
  return {
    events, queries, row, conn, state: () => committed,
    sign: (payload = proof(), secret = env.zenxHandoffSecret) => jwt.sign(payload, secret, { expiresIn: '60s' }),
    async redeem(token, body = {}) {
      const result = { cookies: [] };
      const res = {
        cookie(name, value, options) {
          assert.ok(events.includes('commit'), 'cookies cannot be emitted before commit');
          assert.equal(pending, undefined, 'cookies cannot be emitted inside a transaction');
          events.push('cookie'); result.cookies.push({ name, value, options }); return this;
        },
        json(value) { result.body = value; return this; },
      };
      await handoff({ headers: {}, body: { token, companySlug: 'company-a', ...body } }, res, (error) => { result.error = error; });
      return result;
    },
  };
}

test('owner proof requires the signed issuer, audience, subject, company and explicit owner claim', () => {
  assert.equal(hasZenxOwnerProof(proof()), true);
  for (const patch of [
    { iss: undefined }, { iss: 'other' }, { aud: undefined }, { aud: 'other' },
    { aud: ['zenx-dietitian'] }, { role: 'admin' }, { role: 'wellness_dietitian' },
    { main_admin_user_id: undefined }, { main_admin_user_id: 'another-owner' },
    { sub: '' }, { sub: null, main_admin_user_id: null }, { company_id: '' }, { company_id: null },
  ]) assert.equal(hasZenxOwnerProof(proof(patch)), false, JSON.stringify(patch));
  assert.equal(hasZenxOwnerProof(null), false);
});

test('bootstrap rejects unproven or mismatched caller snapshots without touching persistence', async () => {
  const conn = { query: () => assert.fail('an unproven caller must not reach persistence') };
  for (const patch of [
    { role: 'dietitian' }, { role: 'client' }, { accountStatus: 'inactive' },
    { accountStatus: 'suspended' }, { companyId: 'other-company' },
    { zenxUserId: 'other-identity' }, { zenxUserId: null },
  ]) assert.equal(await initializeZenxMainAdmin({ user: owner(patch), payload: proof() }, conn), false);
  assert.equal(await initializeZenxMainAdmin({ user: owner(), payload: proof({ main_admin_user_id: undefined }) }, conn), false);
});

for (const [label, options] of [
  ['inactive company', { lockedCompany: { status: 'INACTIVE' } }],
  ['missing company', { missingLockedCompany: true }],
  ['inactive current user', { lockedUser: { account_status: 'inactive' } }],
  ['suspended current user', { lockedUser: { account_status: 'suspended' } }],
  ['current non-admin role', { lockedUser: { role: 'dietitian' } }],
  ['changed company', { lockedUser: { company_id: 'other-company' } }],
  ['relinked identity', { lockedUser: { zenx_user_id: 'another-identity' } }],
  ['missing current user', { missingLockedUser: true }],
]) test(`bootstrap rechecks ${label} under transaction locks`, async (t) => {
  const f = fixture(t, options);
  await f.conn.beginTransaction();
  assert.equal(await initializeZenxMainAdmin({ user: owner(), payload: proof() }, f.conn), false);
  await f.conn.commit();
  assert.equal(f.state().control, null);
  assert.equal(f.state().audits.length, 0);
  assert.ok(f.queries.every(({ sql }) => !sql.startsWith('INSERT')));
});

test('signed owner SSO atomically initializes ownership and hydrates all 29 permissions despite old denied overrides', async (t) => {
  const f = fixture(t);
  const payload = proof();
  const result = await f.redeem(f.sign(payload));
  assert.equal(result.error, undefined);
  assert.ok(result.body.accessToken);
  assert.equal(result.body.user.isMainAdmin, true);
  assert.equal(result.body.user.permissionsConfigured, true);
  assert.equal(PERMISSION_KEYS.length, 29);
  assert.deepEqual(result.body.user.permissions, Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true])));
  assert.deepEqual(result.body.user.permissionOverrides, allDenied);
  assert.equal(result.body.user.passwordHash, undefined);
  assert.deepEqual(f.state().control, { company_id: companyId, main_admin_user_id: ownerId });
  assert.equal(f.state().audits.length, 1);
  const [, auditCompany, target, action, details] = f.state().audits[0];
  assert.deepEqual([auditCompany, target, action], [companyId, ownerId, 'main_admin_initialized']);
  assert.deepEqual(JSON.parse(details), { source: 'zenx_handoff', zenxUserId: zenxId });
  assert.equal(result.cookies.length, 1);
  assert.equal(result.cookies[0].name, 'nourishly_refresh');
  assert.equal(result.cookies[0].options.httpOnly, true);
  assert.deepEqual(f.state().sessions[0].slice(0, 4), [payload.jti, 'wellness', ownerId, companyId]);
  assert.equal(f.state().sessions[0][4], digest(result.cookies[0].value));
  assert.equal(f.state().sessions[0][5], digest(f.row.password_hash));
  assert.ok(f.events.indexOf('company-lock') < f.events.indexOf('control-lock'));
  assert.ok(f.events.indexOf('control-lock') < f.events.indexOf('user-lock'));
  assert.ok(f.events.indexOf('commit') < f.events.indexOf('cookie'));
});

test('a fresh owner handoff token is idempotent for ownership and creates a distinct session', async (t) => {
  const f = fixture(t);
  for (let index = 0; index < 2; index += 1) {
    const result = await f.redeem(f.sign());
    assert.equal(result.error, undefined);
    assert.equal(result.body.user.isMainAdmin, true);
    assert.equal(result.cookies.length, 1);
  }
  assert.equal(f.state().audits.length, 1);
  assert.equal(f.state().sessions.length, 2);
  assert.notEqual(f.state().sessions[0][0], f.state().sessions[1][0]);
});

for (const existingOwner of [ownerId, 'previous-owner']) test(`SSO preserves the existing designated owner ${existingOwner}`, async (t) => {
  const f = fixture(t, { existingOwner });
  const result = await f.redeem(f.sign());
  assert.equal(result.error, undefined);
  assert.equal(f.state().control.main_admin_user_id, existingOwner);
  assert.equal(f.state().audits.length, 0);
  assert.equal(result.body.user.isMainAdmin, existingOwner === ownerId);
  assert.equal(result.body.user.permissions['permissions.manage'], existingOwner === ownerId);
});

test('replayed owner proof rolls back a newly attempted grant and emits no cookie', async (t) => {
  const f = fixture(t);
  const payload = proof();
  const token = f.sign(payload);
  f.state().sessions.push([payload.jti, 'wellness', ownerId, companyId]);
  const result = await f.redeem(token);
  assert.equal(result.error?.status, 401);
  assert.equal(result.cookies.length, 0);
  assert.equal(result.body, undefined);
  assert.equal(f.state().control, null);
  assert.deepEqual(f.state().audits, []);
  assert.equal(f.state().sessions.length, 1);
  assert.ok(f.events.includes('owner-write'), 'exercise a tentative grant before replay detection');
  assert.ok(f.events.includes('rollback'));
  const hydrated = await hydrateUserPermissions(owner());
  assert.equal(hydrated.isMainAdmin, false);
  assert.equal(hydrated.permissions['permissions.manage'], false);
});

test('a successfully redeemed token cannot be reused and its existing owner grant is preserved', async (t) => {
  const f = fixture(t);
  const token = f.sign();
  assert.equal((await f.redeem(token)).error, undefined);
  const replay = await f.redeem(token);
  assert.equal(replay.error?.status, 401);
  assert.equal(replay.cookies.length, 0);
  assert.equal(f.state().control.main_admin_user_id, ownerId);
  assert.equal(f.state().audits.length, 1);
  assert.equal(f.state().sessions.length, 1);
});

for (const [label, options] of [
  ['audit failure', { failAudit: true }],
  ['commit failure', { commitFailures: 1 }],
]) test(`${label} rolls back ownership, audit and session without emitting cookies`, async (t) => {
  const f = fixture(t, options);
  const result = await f.redeem(f.sign());
  assert.match(result.error?.message ?? '', /synthetic/);
  assert.equal(result.cookies.length, 0);
  assert.equal(result.body, undefined);
  assert.deepEqual(f.state(), { control: null, audits: [], sessions: [] });
  assert.ok(f.events.includes('rollback'));
});

test('a retried transaction emits exactly the committed session cookie', async (t) => {
  const f = fixture(t, { commitFailures: 1, commitErrorCode: 'ER_LOCK_DEADLOCK' });
  const result = await f.redeem(f.sign());
  assert.equal(result.error, undefined);
  assert.equal(f.state().audits.length, 1);
  assert.equal(f.state().sessions.length, 1);
  assert.equal(result.cookies.length, 1);
  assert.equal(digest(result.cookies[0].value), f.state().sessions[0][4]);
  assert.equal(verifyRefreshToken(result.cookies[0].value).sid, f.state().sessions[0][0]);
  assert.equal(f.events.filter((event) => event === 'rollback').length, 1);
});

for (const [label, patch, options] of [
  ['role-only legacy token', { main_admin_user_id: undefined }, {}],
  ['legacy token without issuer', { iss: undefined }, {}],
  ['legacy token without audience', { aud: undefined }, {}],
  ['another owner claim', { main_admin_user_id: 'another-owner' }, {}],
  ['ordinary source staff', { role: 'wellness_dietitian' }, {}],
  ['inactive local admin', {}, { user: { account_status: 'inactive' } }],
  ['local dietitian', {}, { user: { role: 'dietitian' } }],
  ['source company resolved through an older same-slug mirror', { company_id: 'recreated-company' }, {}],
]) test(`${label} cannot acquire owner privileges`, async (t) => {
  const f = fixture(t, options);
  const result = await f.redeem(f.sign(proof(patch)), { main_admin_user_id: zenxId, isMainAdmin: true });
  assert.equal(result.error, undefined);
  assert.equal(result.body.user.isMainAdmin, false);
  assert.equal(result.body.user.permissions['permissions.manage'], false);
  assert.equal(f.state().control, null);
  assert.equal(f.state().audits.length, 0);
});

for (const [label, patch, options, status] of [
  ['wrong issuer', { iss: 'foreign-issuer' }, {}, 401],
  ['wrong audience', { aud: 'foreign-audience' }, {}, 401],
  ['inactive company', {}, { company: { status: 'INACTIVE' } }, 403],
  ['suspended local admin', {}, { user: { account_status: 'suspended' } }, 403],
  ['linked user from another company', {}, { user: { company_id: 'other-company' } }, 403],
  ['email match linked to another identity', {}, { user: { zenx_user_id: 'other-identity' } }, 403],
  ['email match with a different role', {}, { user: { zenx_user_id: null, role: 'dietitian' } }, 403],
  ['email match in another company', {}, { user: { zenx_user_id: null, company_id: 'other-company' } }, 403],
  ['concurrent email relink', {}, { user: { zenx_user_id: null }, concurrentLink: 'other-identity' }, 403],
]) test(`${label} rejects SSO without owner, session or cookie writes`, async (t) => {
  const f = fixture(t, options);
  const result = await f.redeem(f.sign(proof(patch)));
  assert.equal(result.error?.status, status);
  assert.equal(result.cookies.length, 0);
  assert.deepEqual(f.state(), { control: null, audits: [], sessions: [] });
});

test('a token signed with another secret cannot initialize owner access', async (t) => {
  const f = fixture(t);
  const result = await f.redeem(f.sign(proof(), 'different-untrusted-signing-secret'));
  assert.equal(result.error?.status, 401);
  assert.equal(result.cookies.length, 0);
  assert.equal(f.queries.length, 0);
});

test('unlinked email match with role-only claims gets no ownership from body flags', async (t) => {
  const f = fixture(t, { user: { zenx_user_id: null } });
  const result = await f.redeem(f.sign(proof({ main_admin_user_id: undefined })), { main_admin_user_id: zenxId, isMainAdmin: true });
  assert.equal(result.error, undefined);
  assert.equal(f.row.zenx_user_id, zenxId);
  assert.equal(result.body.user.isMainAdmin, false);
  assert.equal(f.state().control, null);
});

test('recreated source company cannot claim an unlinked existing owner through a reused slug and matching email', async (t) => {
  const f = fixture(t, { existingOwner: ownerId, user: { zenx_user_id: null } });
  const result = await f.redeem(f.sign(proof({ company_id: 'recreated-company' })));
  assert.equal(result.error?.status, 403);
  assert.equal(result.cookies.length, 0);
  assert.equal(result.body, undefined);
  assert.equal(f.row.zenx_user_id, null, 'reused slug cannot establish the source identity');
  assert.deepEqual(f.state().control, { company_id: companyId, main_admin_user_id: ownerId });
  assert.deepEqual(f.state().sessions, []);
  assert.deepEqual(f.state().audits, []);
  assert.equal(f.queries.some(({ sql }) => sql.startsWith('UPDATE users SET zenx_user_id')), false);
  assert.equal(f.events.includes('begin'), false);
});

test('exact source company and signed owner proof safely link an unlinked same-email admin and grant all 29 permissions', async (t) => {
  const f = fixture(t, { user: { zenx_user_id: null } });
  const result = await f.redeem(f.sign());
  assert.equal(result.error, undefined);
  assert.equal(f.row.zenx_user_id, zenxId);
  assert.equal(f.row.company_id, companyId);
  assert.equal(result.body.user.isMainAdmin, true);
  assert.equal(result.body.user.permissionsConfigured, true);
  assert.equal(PERMISSION_KEYS.length, 29);
  assert.deepEqual(result.body.user.permissions, Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true])));
  assert.deepEqual(result.body.user.permissionOverrides, allDenied);
  assert.deepEqual(f.state().control, { company_id: companyId, main_admin_user_id: ownerId });
  assert.equal(f.state().audits.length, 1);
  assert.equal(f.state().sessions.length, 1);
  assert.equal(result.cookies.length, 1);
});

test('linkZenxUser compare-and-swap permits a new or identical link and rejects replacement or scope changes', async (t) => {
  const f = fixture(t, { user: { zenx_user_id: null } });
  assert.equal((await linkZenxUser(ownerId, zenxId, companyId, 'admin')).zenxUserId, zenxId);
  assert.equal((await linkZenxUser(ownerId, zenxId, companyId, 'admin')).zenxUserId, zenxId);
  for (const args of [
    [ownerId, 'replacement-identity', companyId, 'admin'],
    [ownerId, zenxId, 'other-company', 'admin'],
    [ownerId, zenxId, companyId, 'dietitian'],
    [ownerId, zenxId, null, 'admin'],
    [ownerId, zenxId, companyId, 'client'],
  ]) await assert.rejects(linkZenxUser(...args), (error) => error.status === 403);
  assert.equal(f.row.zenx_user_id, zenxId);
  assert.equal(f.row.company_id, companyId);
  assert.equal(f.row.role, 'admin');
});

test('createSession uses its supplied transaction connection instead of the pool', async (t) => {
  t.mock.method(pool, 'query', () => assert.fail('transaction session must not use pool.query'));
  const queries = [];
  const conn = { query: async (...args) => { queries.push(args); return [{ affectedRows: 1 }]; } };
  await createSession({ id: 'single-use-id', kind: 'wellness', accountId: ownerId, companyId,
    refreshToken: 'refresh-secret', passwordHash: 'credential-secret', expiresAt: new Date('2030-01-01') }, conn);
  assert.equal(queries.length, 1);
  assert.match(queries[0][0], /^INSERT INTO auth_sessions/);
  assert.deepEqual(queries[0][1].slice(0, 6), ['single-use-id', 'wellness', ownerId, companyId, digest('refresh-secret'), digest('credential-secret')]);
});
