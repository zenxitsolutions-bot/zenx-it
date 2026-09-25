import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/db/pool.js';
import { getUserPhoto } from '../../src/controllers/userPhoto.controller.js';

test('participant photo reads respect staff directory permissions without changing self/client relationship access', async (t) => {
  const users = new Map([
    ['client', { id: 'client', role: 'client', company_id: 'company', assigned_dietitian_id: 'dietitian' }],
    ['dietitian', { id: 'dietitian', role: 'dietitian', company_id: 'company' }],
    ['foreign', { id: 'foreign', role: 'client', company_id: 'other-company' }],
  ]);
  let photoReads = 0;
  t.mock.method(pool, 'query', async (sql, values) => {
    if (sql.includes('FROM users u')) return [[users.get(values[0])].filter(Boolean)];
    if (sql.includes('FROM user_photos')) { photoReads++; return [[]]; }
    throw new Error('Unexpected query in photo permission fixture');
  });
  t.mock.method(pool, 'execute', async (sql) => {
    assert.match(sql, /^SELECT image, mime_type FROM user_photos/);
    photoReads++;
    return [[]];
  });
  t.mock.method(pool, 'getConnection', async () => { throw new Error('Photo fixture must never open a database connection'); });
  async function photo(user, target) {
    let error, status;
    const res = { set() { return this; }, status(value) { status = value; return this; }, end() {}, type() { return this; }, send() {} };
    await getUserPhoto({ user: { companyId: 'company', ...user }, params: { id: target } }, res, (value) => { error = value; });
    return { error, status };
  }
  for (const [user, target] of [
    [{ id: 'admin', role: 'admin', permissionOverrides: { 'clients.view': false } }, 'client'],
    [{ id: 'dietitian', role: 'dietitian', permissionOverrides: { 'clients.view': false } }, 'client'],
    [{ id: 'admin', role: 'admin', permissionOverrides: { 'staff.view': false } }, 'dietitian'],
  ]) assert.equal((await photo(user, target)).error?.status, 403);
  assert.equal(photoReads, 0, 'denied staff must not learn whether a photo exists');
  assert.equal((await photo({ id: 'admin', role: 'admin' }, 'foreign')).error?.status, 404);
  assert.equal((await photo({ id: 'admin', role: 'admin' }, 'missing')).error?.status, 404);
  for (const [user, target] of [
    [{ id: 'admin', role: 'admin' }, 'client'],
    [{ id: 'admin', role: 'admin' }, 'dietitian'],
    [{ id: 'dietitian', role: 'dietitian' }, 'client'],
    [{ id: 'dietitian', role: 'dietitian', permissionOverrides: { 'clients.view': false, 'staff.view': false } }, 'dietitian'],
    [{ id: 'client', role: 'client', assignedDietitian: 'dietitian' }, 'dietitian'],
    [{ id: 'client', role: 'client' }, 'client'],
  ]) {
    const result = await photo(user, target);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 204);
  }
  assert.equal(photoReads, 6);
});
