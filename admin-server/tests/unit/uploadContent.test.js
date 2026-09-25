import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectUpload, safeDownloadType } from '../../src/utils/uploadContent.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSgAAAABJRU5ErkJggg==', 'base64');
const maxBytes = 2 * 1024 * 1024;
const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
const file = (buffer = png, originalname = 'scan.png', mimetype = 'image/png') => ({ buffer, originalname, mimetype });

test('upload content is identified from bytes, with normalized display names', () => {
  assert.deepEqual(inspectUpload(file(png, '../scan.png'), { maxBytes }), { mime: 'image/png', extension: 'png', originalname: 'scan.png' });
  assert.equal(inspectUpload(file(png, 'C:\\fakepath\\scan.png'), { maxBytes }).originalname, 'scan.png');
  assert.equal(inspectUpload(file(png, 'scan.PNG', 'application/octet-stream'), { maxBytes }).mime, 'image/png');
  assert.equal(inspectUpload(file(pdf, 'lab.pdf', 'application/pdf'), { maxBytes, allowPdf: true }).mime, 'application/pdf');
});
test('fake image types, active documents, mismatched extensions and truncated PDFs are rejected', () => {
  const cases = [
    file(Buffer.from('<svg onload="alert(1)"></svg>')),
    file(Buffer.from('<!doctype html><script>example</script>')),
    file(png, 'scan.html'),
    file(png, 'scan.jpg'),
    file(png, 'scan.png', 'text/html'),
    file(pdf, 'lab.pdf', 'application/pdf'),
    file(Buffer.from('%PDF-1.7\nno end marker'), 'lab.pdf', 'application/pdf'),
    file(Buffer.alloc(0)),
  ];
  for (const item of cases) assert.throws(() => inspectUpload(item, { maxBytes }), /Choose|match/);
  assert.throws(() => inspectUpload(cases[6], { maxBytes, allowPdf: true }), /valid/);
});
test('oversized buffers and unsupported legacy file types fail closed', () => {
  assert.throws(() => inspectUpload(file(Buffer.alloc(maxBytes + 1)), { maxBytes }), /2 MB/);
  assert.equal(safeDownloadType('old-report.html'), 'application/octet-stream');
  assert.equal(safeDownloadType('old-report.docx'), 'application/octet-stream');
  assert.equal(safeDownloadType('old-report.pdf'), 'application/pdf');
  assert.equal(safeDownloadType('old-photo.jpg'), 'image/jpeg');
});
