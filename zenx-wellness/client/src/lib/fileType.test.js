import test from 'node:test';
import assert from 'node:assert/strict';
import { getFilePreviewKind } from './fileType.js';

test('report previews require both a safe extension and matching server media type', () => {
  assert.equal(getFilePreviewKind('lab.pdf', 'application/pdf'), 'pdf');
  assert.equal(getFilePreviewKind('lab.PNG', 'image/png'), 'image');
  assert.equal(getFilePreviewKind('lab.pdf', 'text/html'), 'unsupported');
  assert.equal(getFilePreviewKind('lab.png', 'image/svg+xml'), 'unsupported');
  assert.equal(getFilePreviewKind('lab.svg', 'image/svg+xml'), 'unsupported');
  assert.equal(getFilePreviewKind('lab.pdf', 'application/octet-stream'), 'unsupported');
  assert.equal(getFilePreviewKind('lab.html', 'text/html'), 'unsupported');
});
