import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/db/pool.js';
import { listNotifications, readNotification } from '../../src/controllers/notification.controller.js';

const viewer = { id: 'staff-1', role: 'dietitian', permissions: { 'diet_plans.view': false, 'calls.view': false } };
const hidden = { id: 'notification-1', user_id: 'staff-1', type: 'meal-swap-requested', title: 'Client plan information', body: 'Private meal details', url: '/app/clients/client-1' };
const permitted = { id: 'notification-2', user_id: 'staff-1', type: 'info', title: 'Account updated', url: '/app/settings' };

test('notification list omits previously saved content from a now-disabled module', async (t) => {
  t.mock.method(pool, 'query', async (sql, values) => {
    assert.match(sql, /FROM notifications WHERE user_id/);
    assert.equal(values[0], viewer.id);
    return [[hidden, permitted]];
  });
  let result;
  await listNotifications({ user: viewer }, { json: (body) => { result = body; } }, (error) => { throw error; });
  assert.deepEqual(result.map((item) => item._id), [permitted.id]);
  assert.doesNotMatch(JSON.stringify(result), /Private meal details|Client plan information/);
});

test('notification detail/read cannot bypass module denial or user ownership checks', async (t) => {
  let record = hidden;
  let writes = 0;
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.startsWith('UPDATE')) { writes += 1; return [{}]; }
    assert.match(sql, /SELECT \* FROM notifications WHERE id/);
    return [[record]];
  });
  for (const candidate of [hidden, { ...permitted, user_id: 'other-staff' }]) {
    record = candidate;
    let denied;
    await readNotification({ user: viewer, params: { id: candidate.id } }, { json: () => assert.fail('must not return notification') }, (error) => { denied = error; });
    assert.equal(denied.status, 404);
  }
  assert.equal(writes, 0);
});
