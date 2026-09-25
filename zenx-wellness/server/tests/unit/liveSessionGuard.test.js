import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createLiveSessionGuard } from '../../src/services/liveSessionGuard.js';
import { addLiveConnection, removeLiveConnection, sendLiveEvent, isUserOnline } from '../../src/services/messageLive.js';
import { streamMessages } from '../../src/controllers/message.controller.js';
import { pool } from '../../src/db/pool.js';

function fixture() {
  const user = { id: 'client', role: 'client', companyId: 'company', accountStatus: 'active', passwordHash: 'synthetic-original-hash' };
  const req = { user: { ...user }, authSession: { id: 'session', kind: 'wellness', accountId: 'client', companyId: 'company' }, accessTokenExpiresAt: 2000 };
  return { user, req };
}

test('live authorization uses fresh account/session/company state and fails closed', async () => {
  const { user, req } = fixture();
  let active = true;
  let company = { status: 'ACTIVE' };
  let clock = 1000;
  let failed = false;
  const guard = createLiveSessionGuard(req, {
    now: () => clock,
    findUser: async () => { if (failed) throw new Error('database unavailable'); return user; },
    findCompany: async () => company,
    sessionActive: async (input) => active && input.passwordHash === 'synthetic-original-hash',
  });
  assert.equal(await guard(), true);
  active = false;
  assert.equal(await guard(), false, 'logout/revocation is not cached');
  active = true;
  user.passwordHash = 'synthetic-reset-hash';
  assert.equal(await guard(), false, 'password reset revokes an already-connected stream');
  user.passwordHash = 'synthetic-original-hash';
  for (const value of ['suspended', 'inactive']) {
    user.accountStatus = value;
    assert.equal(await guard(), false);
  }
  user.accountStatus = 'active';
  user.mustChangePassword = true;
  assert.equal(await guard(), false);
  user.mustChangePassword = false;
  user.companyId = 'other-company';
  assert.equal(await guard(), false);
  user.companyId = 'company';
  company = { status: 'SUSPENDED' };
  assert.equal(await guard(), false);
  company = null;
  assert.equal(await guard(), false);
  company = { status: 'ACTIVE' };
  failed = true;
  assert.equal(await guard(), false, 'database errors never keep a stream authorized');
  failed = false;
  clock = 2000;
  assert.equal(await guard(), false, 'access token expiry is enforced');
});

test('simultaneous events share only the current in-flight authorization check', async () => {
  const { req, user } = fixture();
  let release;
  let reads = 0;
  const guard = createLiveSessionGuard(req, {
    now: () => 1000,
    findUser: () => { reads++; return new Promise((resolve) => { release = () => resolve(user); }); },
    sessionActive: async () => true,
    findCompany: async () => ({ status: 'ACTIVE' }),
  });
  const first = guard(), second = guard();
  assert.equal(reads, 1);
  release();
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  const third = guard();
  assert.equal(reads, 2, 'next event revalidates instead of reusing a stale decision');
  release();
  assert.equal(await third, true);
});

test('event delivery denies revoked sessions without waiting for the heartbeat', async () => {
  let authorized = true;
  const writes = [];
  const res = { writableEnded: false, write: (value) => writes.push(value), end() { this.writableEnded = true; } };
  addLiveConnection('guarded-user', res, { isAuthorized: async () => authorized, onUnauthorized: () => res.end() });
  try {
    await sendLiveEvent('guarded-user', { type: 'message', message: { body: 'allowed' } });
    assert.equal(writes.length, 1);
    authorized = false;
    await sendLiveEvent('guarded-user', { type: 'message', message: { body: 'must not be delivered' } });
    assert.equal(writes.length, 1);
    assert.equal(res.writableEnded, true);
    assert.equal(isUserOnline('guarded-user'), false);
  } finally {
    removeLiveConnection('guarded-user', res);
  }
});

test('active SSE closes on heartbeat revocation and scheduled access-token expiry', async (t) => {
  let active = true;
  let heartbeat;
  let expiry;
  t.mock.method(globalThis, 'setInterval', (callback, delay) => { assert.equal(delay, 25_000); heartbeat = callback; return 10; });
  t.mock.method(globalThis, 'clearInterval', () => {});
  t.mock.method(globalThis, 'setTimeout', (callback, delay) => { assert.ok(delay > 0 && delay <= 60_000); expiry = callback; return 11; });
  t.mock.method(globalThis, 'clearTimeout', () => {});
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM users u')) return [[{ id: 'client', role: 'client', company_id: 'company', account_status: 'active', password_hash: 'synthetic-original-hash' }]];
    if (sql.includes('FROM auth_sessions')) return [active ? [{ id: 'session' }] : []];
    if (sql.includes('FROM companies')) return [[{ id: 'company', status: 'ACTIVE' }]];
    throw new Error('Unexpected query in mocked SSE test');
  });
  async function connect() {
    const { req: properties } = fixture();
    const req = Object.assign(new EventEmitter(), properties, { accessTokenExpiresAt: Date.now() + 60_000 });
    const res = Object.assign(new EventEmitter(), {
      writableEnded: false, setHeader() {}, flushHeaders() {}, write() {},
      end() { this.writableEnded = true; this.emit('close'); },
    });
    const complete = streamMessages(req, res, (error) => { throw error; });
    for (let attempt = 0; attempt < 10 && !isUserOnline('client'); attempt++) await new Promise(setImmediate);
    assert.equal(isUserOnline('client'), true);
    return { res, complete };
  }
  const first = await connect();
  active = false;
  await heartbeat();
  await first.complete;
  assert.equal(first.res.writableEnded, true);
  assert.equal(isUserOnline('client'), false);
  active = true;
  const second = await connect();
  expiry();
  await second.complete;
  assert.equal(second.res.writableEnded, true);
  assert.equal(isUserOnline('client'), false);
});
