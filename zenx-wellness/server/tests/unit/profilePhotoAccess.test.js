import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { pool } from '../../src/db/pool.js';
import { userRouter } from '../../src/routes/user.routes.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { signAccessToken } from '../../src/utils/jwt.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSgAAAABJRU5ErkJggg==', 'base64');
const replacementPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

function photoUpload(bytes) {
  const data = new FormData();
  data.append('photo', new Blob([bytes], { type: 'image/png' }), 'photo.png');
  return data;
}

// Exercise the real router, authentication, and photo handlers without connecting to MySQL.
test('participant photos enforce authentication, relationships, and company boundaries', async (t) => {
  const users = new Map();
  const photos = new Map();
  const photoReads = [];
  const callLookups = [];
  const calls = [{ client: 'client', dietitian: 'former-dietitian' }];
  function account(id, role, company = 'company-a', assignedDietitian = null) {
    users.set(id, { id, role, company_id: company, assigned_dietitian_id: assignedDietitian, account_status: 'active', password_hash: 'fixture-password-hash' });
    photos.set(id, { image: png, mime_type: 'image/png' });
  }
  account('client', 'client', 'company-a', 'dietitian');
  account('dietitian', 'dietitian');
  account('former-dietitian', 'dietitian');
  account('unrelated-dietitian', 'dietitian');
  account('other-client', 'client', 'company-a', 'dietitian');
  account('admin', 'admin');
  account('foreign-client', 'client', 'company-b', 'dietitian');
  account('foreign-dietitian', 'dietitian', 'company-b');
  account('no-photo', 'client', 'company-a', 'dietitian');
  photos.delete('no-photo');

  t.mock.method(pool, 'query', async (sql, params) => {
    if (sql.includes('FROM auth_sessions')) return [[{ id: params[0] }]];
    if (sql.includes('FROM users u') && sql.includes('WHERE u.id = ?')) {
      return [[users.get(params[0])].filter(Boolean)];
    }
    if (sql.includes('FROM companies WHERE id = ?')) return [[{ id: params[0], status: 'ACTIVE' }]];
    throw new Error(`Unexpected database query: ${sql}`);
  });
  t.mock.method(pool, 'execute', async (sql, params) => {
    if (sql.startsWith('SELECT image, mime_type FROM user_photos')) {
      photoReads.push(params[0]);
      return [[photos.get(params[0])].filter(Boolean)];
    }
    if (sql.includes('FROM calls c')) {
      callLookups.push(params);
      assert.match(sql, /c\.client_id = \? AND c\.dietitian_id = \?/);
      assert.match(sql, /cu\.company_id = \? AND du\.company_id = \?/);
      const [client, dietitian, clientCompany, dietitianCompany] = params;
      return [calls.filter((call) => call.client === client && call.dietitian === dietitian
        && users.get(client)?.company_id === clientCompany
        && users.get(dietitian)?.company_id === dietitianCompany)];
    }
    if (sql.startsWith('INSERT INTO user_photos')) {
      const [id, image, mime_type] = params;
      photos.set(id, { image, mime_type });
      return [{}];
    }
    if (sql.startsWith('DELETE FROM user_photos')) {
      photos.delete(params[0]);
      return [{}];
    }
    throw new Error(`Unexpected database operation: ${sql}`);
  });

  const app = express();
  app.use('/api/users', userRouter);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api/users`;
  function request(viewer, target, options = {}) {
    const user = users.get(viewer);
    const headers = user ? { Authorization: `Bearer ${signAccessToken({ id: user.id, role: user.role, companyId: user.company_id }, `session-${user.id}`)}` } : {};
    return fetch(`${url}/${target}/photo`, { ...options, headers });
  }
  async function assertPhoto(viewer, target, expected = png) {
    const response = await request(viewer, target);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('content-security-policy'), "default-src 'none'; sandbox");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected);
  }
  async function assertDenied(viewer, target, status) {
    const beforeReads = photoReads.length;
    const response = await request(viewer, target);
    assert.equal(response.status, status, `${viewer} reading ${target}`);
    assert.equal(photoReads.length, beforeReads, 'denied requests must not read photo data');
  }
  try {
    await t.test('requires login and honors suspended/password-change restrictions', async () => {
      await assertDenied(null, 'dietitian', 401);
      users.get('client').account_status = 'suspended';
      await assertDenied('client', 'dietitian', 403);
      users.get('client').account_status = 'active';
      users.get('client').must_change_password = true;
      await assertDenied('client', 'dietitian', 403);
      users.get('client').must_change_password = false;
    });
    await t.test('current assigned partners can read each other and their own photo', async () => {
      await assertPhoto('client', 'dietitian');
      await assertPhoto('dietitian', 'client');
      await assertPhoto('client', 'client');
      await assertPhoto('dietitian', 'dietitian');
      assert.equal(callLookups.length, 0, 'current assignment needs no call-history lookup');
    });
    await t.test('call participants retain visibility after reassignment in both directions', async () => {
      await assertPhoto('client', 'former-dietitian');
      await assertPhoto('former-dietitian', 'client');
      assert.deepEqual(callLookups, [
        ['client', 'former-dietitian', 'company-a', 'company-a'],
        ['client', 'former-dietitian', 'company-a', 'company-a'],
      ]);
    });
    await t.test('unrelated clients and dietitians cannot read photos', async () => {
      await assertDenied('client', 'other-client', 403);
      await assertDenied('client', 'unrelated-dietitian', 403);
      await assertDenied('unrelated-dietitian', 'client', 403);
      await assertDenied('dietitian', 'former-dietitian', 403);
      await assertDenied('other-client', 'former-dietitian', 403);
      await assertDenied('client', 'admin', 403);
    });
    await t.test('cross-company and missing accounts are hidden even from admins and stale relationships', async () => {
      const beforeLookups = callLookups.length;
      await assertDenied('dietitian', 'foreign-client', 404);
      await assertDenied('client', 'foreign-dietitian', 404);
      await assertDenied('admin', 'foreign-client', 404);
      await assertDenied('admin', 'missing-user', 404);
      users.get('former-dietitian').company_id = 'company-b';
      await assertDenied('client', 'former-dietitian', 404);
      users.get('former-dietitian').company_id = 'company-a';
      assert.equal(callLookups.length, beforeLookups, 'tenant checks precede call-history lookups');
    });
    await t.test('company admins can view client and dietitian photos', async () => {
      await assertPhoto('admin', 'client');
      await assertPhoto('admin', 'dietitian');
    });
    await t.test('authorized missing photos return 204 with private caching', async () => {
      const response = await request('dietitian', 'no-photo');
      assert.equal(response.status, 204);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal(await response.text(), '');
      await assertDenied('former-dietitian', 'no-photo', 403);
    });
    await t.test('own photo upload/read/delete endpoints remain scoped to the signed-in user', async () => {
      assert.equal((await request('no-photo', 'me', { method: 'PUT', body: photoUpload(png) })).status, 200);
      await assertPhoto('no-photo', 'me');
      assert.equal((await request('no-photo', 'me', { method: 'DELETE' })).status, 204);
      assert.equal((await request('no-photo', 'me')).status, 204);
      await assertPhoto('client', 'me');
      assert.equal((await request('admin', 'me')).status, 403);
    });
    await t.test('participant photo URLs cannot upload or delete another user\'s photo', async () => {
      const originalPhotos = new Map(photos);
      for (const [viewer, target] of [['client', 'dietitian'], ['dietitian', 'client'], ['admin', 'dietitian']]) {
        assert.equal((await request(viewer, target, { method: 'PUT', body: photoUpload(replacementPng) })).status, 404);
        assert.equal((await request(viewer, target, { method: 'DELETE' })).status, 404);
      }
      assert.deepEqual(photos, originalPhotos, 'rejected participant writes preserve every photo');
      await assertPhoto('client', 'dietitian');
      await assertPhoto('dietitian', 'client');
    });
    await t.test('dietitian uploads and replacements appear to their client; removal returns 204', async () => {
      assert.equal((await request('dietitian', 'me', { method: 'DELETE' })).status, 204);
      assert.equal((await request('client', 'dietitian')).status, 204);
      assert.equal((await request('dietitian', 'me', { method: 'PUT', body: photoUpload(replacementPng) })).status, 200);
      await assertPhoto('client', 'dietitian', replacementPng);
      assert.equal((await request('dietitian', 'me', { method: 'PUT', body: photoUpload(png) })).status, 200);
      await assertPhoto('client', 'dietitian', png);
      assert.equal((await request('dietitian', 'me', { method: 'DELETE' })).status, 204);
      assert.equal((await request('client', 'dietitian')).status, 204);
    });
    await t.test('client uploads appear to their assigned dietitian with the new exact bytes', async () => {
      assert.equal((await request('client', 'me', { method: 'PUT', body: photoUpload(replacementPng) })).status, 200);
      await assertPhoto('dietitian', 'client', replacementPng);
    });
  } finally {
    server.close();
    server.closeAllConnections();
    await once(server, 'close');
  }
});
