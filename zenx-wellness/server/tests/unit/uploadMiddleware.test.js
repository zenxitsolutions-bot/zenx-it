import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import { once } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import { upload, MAX_UPLOAD_BYTES } from '../../src/middleware/upload.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSgAAAABJRU5ErkJggg==', 'base64');
const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n');

test('multipart image/report middleware validates bounded in-memory uploads without writing files', async (t) => {
  let diskWrites = 0;
  const noWrite = () => { diskWrites += 1; throw new Error('Upload middleware must not write to disk'); };
  for (const method of ['createWriteStream', 'writeFileSync', 'mkdirSync', 'writeFile', 'mkdir']) t.mock.method(fs, method, noWrite);
  for (const method of ['writeFile', 'mkdir', 'open']) t.mock.method(fs.promises, method, noWrite);
  syncBuiltinESMExports();
  const app = express();
  let handled = 0;
  function inspect(req, res) {
    handled += 1;
    assert.ok(Buffer.isBuffer(req.file.buffer));
    assert.equal(req.file.path, undefined);
    assert.equal(req.file.destination, undefined);
    assert.equal(req.file.filename, undefined);
    res.json({ mime: req.file.mime, extension: req.file.extension, length: req.file.buffer.length, note: req.body.note });
  }
  app.post('/image', upload.single('image'), inspect);
  app.post('/report', upload.single('file'), inspect);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  function form(field = 'image', bytes = png, filename = 'photo.png', type = 'image/png') {
    const data = new FormData();
    data.append(field, new Blob([bytes], { type }), filename);
    return data;
  }
  async function submit(route, data, status) {
    const before = handled;
    const response = await fetch(base + route, { method: 'POST', body: data });
    assert.equal(response.status, status);
    if (status !== 200) assert.equal(handled, before, 'rejected upload must not reach a persistence controller');
    return response.json();
  }
  try {
    assert.equal((await submit('/image', form(), 200)).mime, 'image/png');
    const report = form('file', pdf, 'lab.pdf', 'application/pdf'); report.append('note', 'Recent lab report');
    assert.deepEqual(await submit('/report', report, 200), { mime: 'application/pdf', extension: 'pdf', length: pdf.length, note: 'Recent lab report' });
    assert.equal((await submit('/report', form('file'), 200)).mime, 'image/png');
    await submit('/image', form('image', pdf, 'lab.pdf', 'application/pdf'), 400);
    await submit('/image', form('image', Buffer.from('<svg onload="example"></svg>')), 400);
    await submit('/image', form('image', png, 'photo.png', 'text/html'), 400);
    await submit('/report', form('file', Buffer.from('%PDF-1.7\ntruncated'), 'lab.pdf', 'application/pdf'), 400);
    await submit('/image', form('image', Buffer.alloc(MAX_UPLOAD_BYTES + 1)), 400);
    await submit('/report', form('file', Buffer.alloc(MAX_UPLOAD_BYTES + 1), 'lab.pdf', 'application/pdf'), 400);
    const extraFile = form(); extraFile.append('image', new Blob([png], { type: 'image/png' }), 'second.png');
    await submit('/image', extraFile, 400);
    const extraFields = form('file'); extraFields.append('note', 'one'); extraFields.append('unexpected', 'two');
    await submit('/report', extraFields, 400);
    const longNote = form('file'); longNote.append('note', 'x'.repeat(4001));
    await submit('/report', longNote, 400);
    await submit('/image', form('unexpected'), 400);
    assert.equal(diskWrites, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});
