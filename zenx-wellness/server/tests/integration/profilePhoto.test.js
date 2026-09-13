import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';

// Opt-in local MySQL test. Creates disposable users and removes only those exact IDs.
test('profile photos persist and stay private to the signed-in client', { skip: process.env.TEST_PROFILE_PHOTOS !== '1' }, async () => {
  const { app } = await import('../../src/app.js');
  const { pool } = await import('../../src/db/pool.js');
  const { createUser } = await import('../../src/models/User.js');
  const { signAccessToken } = await import('../../src/utils/jwt.js');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const endpoint = `http://127.0.0.1:${server.address().port}/api/users/me/photo`;
  const created = [];
  try {
    const [[company]] = await pool.query("SELECT id, slug FROM companies WHERE status = 'ACTIVE' LIMIT 1");
    assert.ok(company, 'An active local company is required');
    async function account(role) {
      const user = await createUser({ name: 'Photo verification', email: `photo-test-${randomUUID()}@example.test`, passwordHash: 'unused-test-only', role, companyId: company.id, companySlug: company.slug });
      created.push(user.id);
      return { Authorization: `Bearer ${signAccessToken(user)}` };
    }
    const owner = await account('client'), other = await account('client'), admin = await account('admin');
    const dietitian = await account('dietitian');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSgAAAABJRU5ErkJggg==', 'base64');
    const form = (bytes, type = 'image/png') => { const data = new FormData(); data.append('photo', new Blob([bytes], { type }), 'photo.png'); return data; };
    assert.equal((await fetch(endpoint)).status, 401);
    assert.equal((await fetch(endpoint, { headers: owner })).status, 204);
    assert.equal((await fetch(endpoint, { method: 'PUT', headers: admin, body: form(png) })).status, 403);
    let response = await fetch(endpoint, { method: 'PUT', headers: owner, body: form(png) });
    assert.equal(response.status, 200, await response.text());
    response = await fetch(endpoint, { headers: owner });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.match(response.headers.get('cache-control'), /private/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
    assert.equal((await fetch(endpoint, { headers: other })).status, 204);
    assert.equal((await fetch(endpoint, { method: 'PUT', headers: owner, body: form(Buffer.from('<svg/>')) })).status, 400);
    assert.equal((await fetch(endpoint, { method: 'PUT', headers: owner, body: form(Buffer.alloc(2 * 1024 * 1024 + 1)) })).status, 400);
    assert.equal((await fetch(endpoint, { headers: owner })).status, 200, 'Rejected replacements preserve the current photo');
    assert.equal((await fetch(endpoint, { method: 'DELETE', headers: owner })).status, 204);
    assert.equal((await fetch(endpoint, { headers: owner })).status, 204);
    assert.equal((await fetch(endpoint, { method: 'PUT', headers: dietitian, body: form(png) })).status, 200);
    response = await fetch(endpoint, { headers: dietitian });
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
    assert.equal((await fetch(endpoint, { headers: other })).status, 204, 'Dietitian photo stays private');
    const profileEndpoint = endpoint.replace('/photo', '');
    response = await fetch(profileEndpoint, { method: 'PATCH', headers: { ...dietitian, 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '+14155552671' }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).phone, '+14155552671');
    response = await fetch(profileEndpoint, { method: 'PATCH', headers: { ...dietitian, 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: 'invalid' }) });
    assert.equal(response.status, 400);
    assert.equal((await fetch(endpoint, { method: 'DELETE', headers: dietitian })).status, 204);
    assert.equal((await fetch(endpoint, { headers: dietitian })).status, 204);
  } finally {
    for (const id of created) await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    server.close();
    await once(server, 'close');
    await pool.end();
  }
});
