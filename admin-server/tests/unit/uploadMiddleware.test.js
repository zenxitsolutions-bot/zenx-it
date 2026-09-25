import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import { once } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import { uploadCompanyLogo } from '../../src/middleware/upload.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSgAAAABJRU5ErkJggg==', 'base64');
test('company-logo multipart middleware rejects invalid/oversized/multiple uploads without writing to disk', async (t) => {
  let diskWrites = 0;
  const noWrite = () => { diskWrites += 1; throw new Error('Upload middleware must not write to disk'); };
  for (const method of ['createWriteStream', 'writeFileSync', 'mkdirSync', 'writeFile', 'mkdir']) t.mock.method(fs, method, noWrite);
  for (const method of ['writeFile', 'mkdir', 'open']) t.mock.method(fs.promises, method, noWrite);
  syncBuiltinESMExports();
  let handled = 0;
  const app = express();
  app.post('/logo', uploadCompanyLogo.single('logo'), (req, res) => {
    handled += 1;
    assert.ok(Buffer.isBuffer(req.file.buffer));
    assert.equal(req.file.path, undefined);
    assert.equal(req.file.filename, undefined);
    res.json({ mime: req.file.mime, length: req.file.buffer.length });
  });
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/logo`;
  function form(bytes = png, filename = 'logo.png', type = 'image/png') {
    const data = new FormData(); data.append('logo', new Blob([bytes], { type }), filename); return data;
  }
  async function submit(data, status) {
    const before = handled;
    const response = await fetch(base, { method: 'POST', body: data });
    assert.equal(response.status, status);
    if (status !== 200) assert.equal(handled, before);
    return response.json();
  }
  try {
    assert.deepEqual(await submit(form(), 200), { mime: 'image/png', length: png.length });
    await submit(form(Buffer.from('<html>not an image</html>')), 400);
    await submit(form(png, 'logo.png', 'text/html'), 400);
    await submit(form(Buffer.from('%PDF-1.7\n%%EOF'), 'logo.pdf', 'application/pdf'), 400);
    await submit(form(Buffer.alloc(2 * 1024 * 1024 + 1)), 400);
    const files = form(); files.append('logo', new Blob([png], { type: 'image/png' }), 'second.png'); await submit(files, 400);
    const fields = form(); fields.append('unexpected', 'value'); await submit(fields, 400);
    const wrongField = new FormData(); wrongField.append('image', new Blob([png], { type: 'image/png' }), 'logo.png'); await submit(wrongField, 400);
    assert.equal(diskWrites, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});
