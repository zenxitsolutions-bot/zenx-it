import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { publicLogos } from '../../src/middleware/publicLogos.js';
import { notFoundHandler, errorHandler } from '../../src/middleware/errorHandler.js';

test('only safe company logo paths are public; legacy active documents are never served', async () => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'zenx-public-logos-test-'));
  const logoRoot = path.join(temporaryRoot, 'company-logos');
  await mkdir(logoRoot);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSgAAAABJRU5ErkJggg==', 'base64');
  const fixtures = { 'normal.png': png, 'legacy.svg': '<svg onload="alert(1)"></svg>', 'legacy.html': '<script>example</script>', 'legacy.js': 'alert(1)', '.hidden.png': png };
  for (const [name, body] of Object.entries(fixtures)) await writeFile(path.join(logoRoot, name), body);
  await writeFile(path.join(temporaryRoot, 'private.png'), png);
  const app = express();
  app.use('/uploads/company-logos', publicLogos(logoRoot));
  app.use(notFoundHandler, errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const valid = await fetch(`${base}/uploads/company-logos/normal.png`);
    assert.equal(valid.status, 200);
    assert.equal(valid.headers.get('content-type'), 'image/png');
    assert.equal(valid.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(valid.headers.get('cross-origin-resource-policy'), 'cross-origin');
    assert.equal(valid.headers.get('content-security-policy'), "default-src 'none'; sandbox");
    assert.deepEqual(Buffer.from(await valid.arrayBuffer()), png);
    for (const url of [
      '/uploads/company-logos/legacy.svg', '/uploads/company-logos/legacy.html', '/uploads/company-logos/legacy.js',
      '/uploads/company-logos/.hidden.png', '/uploads/private.png', '/uploads/company-logos/..%2Fprivate.png',
      '/uploads/company-logos/..%5Cprivate.png', '/uploads/company-logos/missing.png',
    ]) {
      const response = await fetch(base + url);
      assert.equal(response.status, 404, url);
      assert.match(response.headers.get('content-type'), /^application\/json/, url);
      assert.doesNotMatch(await response.text(), /<script>|<svg/);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    // Only this test's freshly created, resolved temporary directory is removed.
    assert.equal(path.dirname(temporaryRoot), path.resolve(tmpdir()));
    assert.ok(path.basename(temporaryRoot).startsWith('zenx-public-logos-test-'));
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
