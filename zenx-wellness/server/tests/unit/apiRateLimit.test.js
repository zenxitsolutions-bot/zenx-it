import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { createApiRateLimiter } from '../../src/middleware/apiRateLimit.js';
import { signAccessToken } from '../../src/utils/jwt.js';

async function withServer(run) {
  const app = express();
  app.use(createApiRateLimiter({ readLimit: 2, writeLimit: 2 }));
  app.all('*', (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  try { await run((path, options) => fetch(url + path, options)); }
  finally { server.close(); server.closeAllConnections(); await once(server, 'close'); }
}

const auth = (id) => ({ Authorization: `Bearer ${signAccessToken({ id, role: 'client', companyId: 'test' }, `session-${id}`)}` });

test('exhausted dashboard reads do not block login or writes; writes remain limited', () => withServer(async (request) => {
  assert.equal((await request('/api/notifications')).status, 200);
  assert.equal((await request('/api/plans')).status, 200);
  const limited = await request('/api/notifications');
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.equal((await request('/api/auth/login', { method: 'POST' })).status, 200);
  assert.equal((await request('/api/users/me', { method: 'PATCH' })).status, 200);
  assert.equal((await request('/api/auth/login', { method: 'POST' })).status, 429);
}));

test('signed-in users have independent read budgets even behind the same IP', () => withServer(async (request) => {
  const alice = { headers: auth('alice') }, bob = { headers: auth('bob') };
  await request('/api/notifications', alice);
  await request('/api/notifications', alice);
  assert.equal((await request('/api/notifications', alice)).status, 429);
  assert.equal((await request('/api/notifications', bob)).status, 200);
  assert.equal((await request('/api/notifications')).status, 200);
}));

test('changing an invalid token cannot evade the IP limit', () => withServer(async (request) => {
  for (const value of ['fake-a', 'fake-b']) assert.equal((await request('/api/plans', { headers: { Authorization: `Bearer ${value}` } })).status, 200);
  assert.equal((await request('/api/plans', { headers: { Authorization: 'Bearer fake-c' } })).status, 429);
}));

test('message streams retain their existing exemption without spending the read budget', () => withServer(async (request) => {
  for (let i = 0; i < 4; i++) assert.equal((await request('/api/messages/stream')).status, 200);
  assert.equal((await request('/api/notifications')).status, 200);
}));
