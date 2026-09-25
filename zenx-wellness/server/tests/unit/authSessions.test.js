import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pool } from '../../src/db/pool.js';
import * as sessions from '../../src/models/AuthSession.js';
import * as jwt from '../../src/utils/jwt.js';
import * as auth from '../../src/controllers/auth.controller.js';
import jsonwebtoken from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { comparePassword } from '../../src/utils/password.js';
import { authenticate } from '../../src/middleware/authenticate.js';
const realms = [{ kind: 'wellness', cookie: 'nourishly_refresh', ...auth, authenticate,
  signAccess: jwt.signAccessToken, signRefresh: jwt.signRefreshToken,
  verifyAccess: jwt.verifyAccessToken, verifyRefresh: jwt.verifyRefreshToken }];

const hash = (value) => createHash('sha256').update(value).digest('hex');
function fixture(t, realm) {
  const records = new Map();
  const account = { id: 'account-a', role: 'dietitian', password_hash: 'original-bcrypt-hash',
    passwordHash: 'original-bcrypt-hash', status: 'ACTIVE', account_status: 'active',
    accountStatus: 'active', company_id: 'company-a', companyId: 'company-a',
    refresh_token_version: 0, refreshTokenVersion: 0 };
  let grantsActive = true;
  let resetUsed = false;
  function active(args) {
    const [id, kind, accountId, companyId, credentialHash] = args;
    const row = records.get(id);
    return row && row.kind === kind && row.accountId === accountId
      && row.companyId === (companyId ?? null) && row.credentialHash === credentialHash
      && !row.revoked && row.expiresAt > new Date() ? row : null;
  }
  t.mock.method(pool, 'query', async (sql, params = []) => {
    if (sql.startsWith('INSERT INTO auth_sessions')) {
      const [id, kind, accountId, companyId, refreshHash, credentialHash, expiresAt] = params;
      if (records.has(id)) throw Object.assign(new Error('duplicate session'), { code: 'ER_DUP_ENTRY' });
      records.set(id, { id, kind, accountId, companyId, refreshHash, credentialHash, expiresAt });
      assert.equal(refreshHash.length, 64);
      assert.equal(credentialHash.length, 64);
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('SELECT id FROM auth_sessions')) {
      const row = active(params);
      return [row ? [{ id: row.id }] : []];
    }
    if (sql.startsWith('UPDATE auth_sessions SET refresh_token_hash')) {
      assert.match(sql, /refresh_token_hash = \? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP/);
      const [nextHash, expiresAt, ...args] = params;
      const row = active(args);
      if (!row || row.refreshHash !== args[5]) return [{ affectedRows: 0 }];
      row.refreshHash = nextHash;
      row.expiresAt = expiresAt;
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('UPDATE auth_sessions SET revoked_at')) {
      for (const row of records.values()) {
        const match = params.length === 1 ? row.kind === 'wellness' && row.accountId === params[0] : params.length === 3
          ? row.id === params[0] && row.kind === params[1] && row.accountId === params[2]
          : row.kind === params[0] && row.accountId === params[1];
        if (match) row.revoked = true;
      }
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('UPDATE users SET password_hash')) {
      account.password_hash = account.passwordHash = params[0];
      account.must_change_password = sql.includes('must_change_password = FALSE') ? false : params[1];
      if (sql.includes('refresh_token_version = refresh_token_version + 1')) account.refresh_token_version += 1;
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('UPDATE users SET refresh_token_version')) {
      account.refresh_token_version += 1;
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('UPDATE users SET last_login') || sql.startsWith('UPDATE companies SET')) return [{ affectedRows: 1 }];
    if (sql.includes('FROM password_reset_tokens')) return [resetUsed ? [] : [{ id: 'reset-id', user_id: account.id }]];
    if (sql.startsWith('UPDATE password_reset_tokens')) {
      const affectedRows = resetUsed ? 0 : 1;
      resetUsed = true;
      return [{ affectedRows }];
    }
    if (sql.includes('FROM profiles') || sql.includes('FROM users')) return [[account]];
    if (sql.includes('FROM companies')) return [[{ id: 'company-a', status: 'ACTIVE', slug: 'company-a' }]];
    if (sql.includes('FROM application_access')) return [grantsActive ? [{ company_id: 'company-a', status: 'ACTIVE' }] : []];
    throw new Error('Unexpected mocked query: ' + sql);
  });
  t.mock.method(pool, 'getConnection', async () => ({
    query: (...args) => pool.query(...args), beginTransaction: async () => {},
    commit: async () => {}, rollback: async () => {}, release: () => {},
  }));
  const scope = (sid = 'session-a') => ({ id: sid, kind: realm.kind, accountId: account.id,
    companyId: realm.kind === 'staff' ? null : account.companyId, passwordHash: account.password_hash });
  async function start(sid = 'session-a') {
    const refreshToken = realm.signRefresh(account, sid);
    await sessions.createSession({ ...scope(sid), refreshToken, expiresAt: new Date(Date.now() + 60_000) });
    return { refreshToken, accessToken: realm.signAccess(account, sid) };
  }
  return { records, account, scope, start, denyGrants: () => { grantsActive = false; } };
}

test('wellness email reset completes setup and revokes old sessions without issuing a new login', async (t) => {
  const f = fixture(t, realms[0]);
  f.account.must_change_password = true;
  const old = await f.start();
  const result = await invoke(auth.resetPassword, { body: { token: 'single-use-token', password: 'New-Safe-Password-123!' } });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 204);
  assert.equal(result.cookies.length, 0);
  assert.equal(f.account.must_change_password, false);
  assert.equal(await comparePassword('New-Safe-Password-123!', f.account.password_hash), true);
  assert.equal((await invoke(auth.refresh, { cookies: { nourishly_refresh: old.refreshToken } })).error?.status, 401);
  assert.equal((await invoke(auth.resetPassword, { body: { token: 'single-use-token', password: 'another-password' } })).error?.status, 400);
});

test('wellness SSO handoff is one-use and cannot issue a cross-company session', async (t) => {
  const f = fixture(t, realms[0]);
  const previous = env.zenxHandoffSecret;
  env.zenxHandoffSecret = 'unit-test-handoff-secret-only';
  t.after(() => { env.zenxHandoffSecret = previous; });
  const payload = { sub: 'zenx-user', email: 'unit@example.test', company_id: 'company-a', company_slug: 'company-a', jti: '11111111-1111-4111-a111-111111111111' };
  const token = jsonwebtoken.sign(payload, env.zenxHandoffSecret, { expiresIn: '60s' });
  const result = await invoke(auth.handoff, { body: { token, companySlug: 'company-a' } });
  assert.equal(result.error, undefined);
  assert.ok(result.body.accessToken);
  assert.equal((await invoke(auth.handoff, { body: { token, companySlug: 'company-a' } })).error?.status, 401);
  f.account.company_id = 'company-b';
  const other = jsonwebtoken.sign({ ...payload, jti: '22222222-2222-4222-a222-222222222222' }, env.zenxHandoffSecret, { expiresIn: '60s' });
  assert.equal((await invoke(auth.handoff, { body: { token: other, companySlug: 'company-a' } })).error?.status, 403);
  assert.equal(f.records.size, 1);
});
async function invoke(handler, req = {}) {
  const result = { status: 200, cookies: [], cleared: [] };
  const res = {
    json(body) { result.body = body; return this; },
    cookie(name, value, options) { result.cookies.push({ name, value, options }); return this; },
    clearCookie(name) { result.cleared.push(name); return this; },
    status(value) { result.status = value; return this; },
    send() { return this; },
  };
  await handler({ headers: {}, ...req }, res, (error) => { if (error) result.error = error; else result.next = true; });
  return result;
}

for (const realm of realms) {
  test(realm.kind + ': signed tokens require session ID and correct token purpose', () => {
    const account = { id: 'user', role: 'client', companyId: 'company-a', refreshTokenVersion: 0 };
    assert.throws(() => realm.verifyRefresh(realm.signRefresh(account)), /Invalid session/);
    assert.throws(() => realm.verifyAccess(realm.signAccess(account)), /Invalid session/);
    const refresh = realm.signRefresh(account, 'sid');
    assert.equal(realm.verifyRefresh(refresh).sid, 'sid');
    assert.notEqual(realm.signRefresh(account, 'sid'), refresh, 'rotation changes even within the same second');
    assert.throws(() => realm.verifyAccess(refresh));
    assert.throws(() => realm.verifyRefresh(realm.signAccess(account, 'sid')));
  });

  test(realm.kind + ': only hashed tokens/credentials are stored; account/realm/tenant/expiry enforced', async (t) => {
    const f = fixture(t, realm);
    const token = await f.start();
    const row = f.records.get('session-a');
    assert.equal(row.refreshHash, hash(token.refreshToken));
    assert.equal(row.credentialHash, hash(f.account.password_hash));
    assert.equal(await sessions.isSessionActive(f.scope()), true);
    for (const patch of [{ accountId: 'other' }, { companyId: 'other' }, { kind: 'other' }, { passwordHash: 'changed' }, { id: null }]) {
      assert.equal(await sessions.isSessionActive({ ...f.scope(), ...patch }), false);
    }
    row.expiresAt = new Date(0);
    assert.equal(await sessions.isSessionActive(f.scope()), false);
  });

  test(realm.kind + ': refresh rotates cookie atomically; replay revokes that session only', async (t) => {
    const f = fixture(t, realm);
    const old = await f.start();
    await f.start('other-device');
    const request = { cookies: { [realm.cookie]: old.refreshToken } };
    const refreshed = await invoke(realm.refresh, request);
    assert.equal(refreshed.error, undefined);
    assert.ok(refreshed.body.accessToken);
    assert.equal(refreshed.cookies.length, 1);
    const nextToken = refreshed.cookies[0].value;
    assert.notEqual(nextToken, old.refreshToken);
    assert.equal(f.records.get('session-a').refreshHash, hash(nextToken));
    assert.equal(refreshed.cookies[0].options.httpOnly, true);
    const replay = await invoke(realm.refresh, request);
    assert.equal(replay.error?.status, 401);
    assert.equal(await sessions.isSessionActive(f.scope()), false);
    assert.equal(await sessions.isSessionActive(f.scope('other-device')), true);
    const rejected = await invoke(realm.authenticate, { headers: { authorization: 'Bearer ' + old.accessToken } });
    assert.equal(rejected.error?.status, 401);
  });

  test(realm.kind + ': concurrent refresh reuse permits only one rotation', async (t) => {
    const f = fixture(t, realm);
    const old = await f.start();
    const req = { cookies: { [realm.cookie]: old.refreshToken } };
    const results = await Promise.all([invoke(realm.refresh, req), invoke(realm.refresh, req)]);
    assert.equal(results.filter((result) => !result.error).length, 1);
    assert.equal(results.filter((result) => result.error?.status === 401).length, 1);
    assert.equal(await sessions.isSessionActive(f.scope()), false, 'reuse invalidates the replayed session');
  });

  test(realm.kind + ': cookie-only logout invalidates access and refresh; bearer-only logout also works', async (t) => {
    const f = fixture(t, realm);
    const first = await f.start();
    const other = await f.start('other-device');
    const before = await invoke(realm.authenticate, { headers: { authorization: 'Bearer ' + first.accessToken } });
    assert.equal(before.next, true);
    const result = await invoke(realm.logout, { cookies: { [realm.cookie]: first.refreshToken } });
    assert.equal(result.status, 204);
    assert.deepEqual(result.cleared, [realm.cookie]);
    assert.equal((await invoke(realm.authenticate, { headers: { authorization: 'Bearer ' + first.accessToken } })).error?.status, 401);
    assert.equal((await invoke(realm.refresh, { cookies: { [realm.cookie]: first.refreshToken } })).error?.status, 401);
    assert.equal(await sessions.isSessionActive(f.scope('other-device')), true);
    await invoke(realm.logout, { headers: { authorization: 'Bearer ' + other.accessToken } });
    assert.equal(await sessions.isSessionActive(f.scope('other-device')), false);
    assert.equal((await invoke(realm.logout, { cookies: { [realm.cookie]: 'invalid-token' } })).status, 204);
  });

  test(realm.kind + ': any password change invalidates previously issued access/refresh, including admin sync', async (t) => {
    const f = fixture(t, realm);
    const old = await f.start();
    f.account.password_hash = f.account.passwordHash = 'replacement-password-hash';
    assert.equal((await invoke(realm.authenticate, { headers: { authorization: 'Bearer ' + old.accessToken } })).error?.status, 401);
    assert.equal((await invoke(realm.refresh, { cookies: { [realm.cookie]: old.refreshToken } })).error?.status, 401);
    const current = await f.start('new-login');
    assert.equal((await invoke(realm.authenticate, { headers: { authorization: 'Bearer ' + current.accessToken } })).next, true);
    await sessions.revokeAccountSessions(realm.kind, f.account.id);
    assert.equal(await sessions.isSessionActive(f.scope('new-login')), false);
  });

  if (realm.kind === 'customer') test('customer refresh re-checks revoked company grants', async (t) => {
    const f = fixture(t, realm);
    const old = await f.start();
    f.denyGrants();
    assert.equal((await invoke(realm.refresh, { cookies: { [realm.cookie]: old.refreshToken } })).error?.status, 401);
  });
}
