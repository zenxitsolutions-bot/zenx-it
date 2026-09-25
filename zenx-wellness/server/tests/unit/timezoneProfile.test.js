import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { pool } from '../../src/db/pool.js';
import { userRouter } from '../../src/routes/user.routes.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { signAccessToken } from '../../src/utils/jwt.js';

test('automatic timezone reporting works through authenticated self-profile updates only', async (t) => {
  const users = new Map([
    ['dietitian', { id: 'dietitian', role: 'dietitian', company_id: 'company', account_status: 'active', timezone: 'UTC', detected_timezone: null }],
    ['client', { id: 'client', role: 'client', company_id: 'company', account_status: 'active', timezone: 'America/Chicago', detected_timezone: null }],
    ['admin', { id: 'admin', role: 'admin', company_id: 'company', account_status: 'active', timezone: 'UTC', detected_timezone: null }],
    ['race-manual', { id: 'race-manual', role: 'dietitian', company_id: 'company', account_status: 'active', timezone: 'UTC', detected_timezone: null }],
    ['race-detection', { id: 'race-detection', role: 'dietitian', company_id: 'company', account_status: 'active', timezone: 'UTC', detected_timezone: null }],
  ]);
  const writes = [];
  for (const user of users.values()) user.password_hash = 'fixture-password-hash';
  let beforeNextWrite = null;
  t.mock.method(pool, 'query', async (sql, params) => {
    if (sql.startsWith('SELECT id, company_id FROM users WHERE id = ?')) return [[users.get(params[0])].filter(Boolean)];
    if (sql.startsWith('SELECT main_admin_user_id FROM company_access_control')) return [[]];
    if (sql.startsWith('SELECT id FROM users WHERE id IN')) return [params.slice(0, -1).map((id) => users.get(id)).filter((user) => user?.company_id === params.at(-1))];
    if (sql.includes('FROM auth_sessions')) return [[{ id: params[0] }]];
    if (sql.includes('FROM users u') && sql.includes('WHERE u.id = ?')) return [[users.get(params[0])].filter(Boolean)];
    if (sql.includes('FROM companies WHERE id = ?')) return [[{ id: 'company', status: 'ACTIVE' }]];
    if (sql.startsWith('UPDATE users SET ')) {
      writes.push({ sql, params });
      const user = users.get(params.at(-1));
      if (beforeNextWrite) {
        beforeNextWrite(user);
        beforeNextWrite = null;
      }
      const assignments = sql.slice('UPDATE users SET '.length).split(' WHERE ')[0].split(', ');
      assignments.forEach((assignment, i) => {
        if (assignment.includes('CASE WHEN')) {
          assert.equal(assignment, "timezone = CASE WHEN detected_timezone IS NULL AND timezone = 'UTC' THEN ? ELSE timezone END");
          if (user.detected_timezone === null && user.timezone === 'UTC') user.timezone = params[i];
        } else {
          user[assignment.split(' = ')[0]] = params[i];
        }
      });
      return [{}];
    }
    throw new Error(`Unexpected database query: ${sql}`);
  });
  t.mock.method(pool, 'getConnection', async () => ({
    query: (sql, params) => pool.query(sql, params),
    async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
  }));

  const app = express();
  app.use(express.json());
  app.use('/api/users', userRouter);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api/users`;
  async function patch(viewer, target, body) {
    const user = users.get(viewer);
    const token = signAccessToken({ id: user.id, role: user.role, companyId: user.company_id }, `session-${user.id}`);
    const response = await fetch(`${base}/${target}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  }

  try {
    await t.test('India dietitian first visit initializes the legacy UTC scheduling default', async () => {
      const result = await patch('dietitian', 'me', { detectedTimezone: 'Asia/Kolkata' });
      assert.equal(result.status, 200);
      assert.equal(result.data.timezone, 'Asia/Kolkata');
      assert.equal(result.data.detectedTimezone, 'Asia/Kolkata');
    });
    await t.test('a subsequent USA device visit changes display zone without moving scheduled hours', async () => {
      const result = await patch('dietitian', 'me', { detectedTimezone: 'America/New_York' });
      assert.equal(result.status, 200);
      assert.equal(result.data.timezone, 'Asia/Kolkata');
      assert.equal(result.data.detectedTimezone, 'America/New_York');
    });
    await t.test('USA client reports their own zone and retains a configured scheduling zone', async () => {
      const result = await patch('client', 'me', { detectedTimezone: 'America/Los_Angeles' });
      assert.equal(result.status, 200);
      assert.equal(result.data.timezone, 'America/Chicago');
      assert.equal(result.data.detectedTimezone, 'America/Los_Angeles');
    });
    await t.test('explicit UTC beats first device detection and stays stable on later detection', async () => {
      const first = await patch('admin', 'me', { timezone: 'UTC', detectedTimezone: 'Asia/Kolkata' });
      const second = await patch('admin', 'me', { detectedTimezone: 'America/Chicago' });
      assert.equal(first.data.timezone, 'UTC');
      assert.equal(second.data.timezone, 'UTC');
    });
    await t.test('invalid reported zones are rejected without database writes', async () => {
      const before = writes.length;
      const result = await patch('client', 'me', { detectedTimezone: 'Not/AZone' });
      assert.equal(result.status, 400);
      assert.equal(writes.length, before);
    });
    await t.test('admin other-account edits cannot overwrite the client device zone', async () => {
      const before = writes.length;
      const result = await patch('admin', 'client', { detectedTimezone: 'Asia/Kolkata' });
      assert.equal(result.status, 200);
      assert.equal(result.data.detectedTimezone, 'America/Los_Angeles');
      assert.equal(writes.length, before);
    });
    await t.test('manual scheduling edit between authentication and automatic save is not overwritten', async () => {
      beforeNextWrite = (user) => { user.timezone = 'America/Chicago'; };
      const result = await patch('race-manual', 'me', { detectedTimezone: 'Asia/Kolkata' });
      assert.equal(result.status, 200);
      assert.equal(result.data.timezone, 'America/Chicago');
      assert.equal(result.data.detectedTimezone, 'Asia/Kolkata');
    });
    await t.test('a competing first detection cannot reinitialize a scheduling zone from stale auth', async () => {
      beforeNextWrite = (user) => { user.timezone = 'UTC'; user.detected_timezone = 'UTC'; };
      const result = await patch('race-detection', 'me', { detectedTimezone: 'Asia/Kolkata' });
      assert.equal(result.status, 200);
      assert.equal(result.data.timezone, 'UTC');
      assert.equal(result.data.detectedTimezone, 'Asia/Kolkata');
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
