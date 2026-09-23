import test from 'node:test';
import assert from 'node:assert/strict';
import { updateUser } from '../../src/models/User.js';

function fakeConnection() {
  const writes = [];
  return {
    writes,
    async query(sql, params) {
      if (sql.startsWith('UPDATE users SET ')) { writes.push({ sql, params }); return [{}]; }
      if (sql.includes('FROM users u')) return [[{ id: params[0], timezone: 'UTC', detected_timezone: null }]];
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
}

test('automatic timezone initialization is a row-atomic CASE before the detected value assignment', async () => {
  const conn = fakeConnection();
  const patch = { detectedTimezone: 'Asia/Kolkata', name: 'Dietitian' };
  await updateUser('viewer', patch, conn);
  assert.deepEqual(conn.writes, [{
    sql: "UPDATE users SET timezone = CASE WHEN detected_timezone IS NULL AND timezone = 'UTC' THEN ? ELSE timezone END, name = ?, detected_timezone = ? WHERE id = ?",
    params: ['Asia/Kolkata', 'Dietitian', 'Asia/Kolkata', 'viewer'],
  }]);
  assert.deepEqual(patch, { detectedTimezone: 'Asia/Kolkata', name: 'Dietitian' }, 'input remains unchanged');
});

test('explicit scheduling timezone skips automatic initialization, including explicit UTC', async () => {
  const conn = fakeConnection();
  await updateUser('viewer', { timezone: 'UTC', detectedTimezone: 'Asia/Kolkata' }, conn);
  assert.deepEqual(conn.writes, [{
    sql: 'UPDATE users SET timezone = ?, detected_timezone = ? WHERE id = ?',
    params: ['UTC', 'Asia/Kolkata', 'viewer'],
  }]);
});

test('ordinary profile changes never initialize scheduling timezone', async () => {
  const conn = fakeConnection();
  await updateUser('viewer', { name: 'Dietitian' }, conn);
  assert.deepEqual(conn.writes, [{ sql: 'UPDATE users SET name = ? WHERE id = ?', params: ['Dietitian', 'viewer'] }]);
});
