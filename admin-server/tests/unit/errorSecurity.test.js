import test from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { ApiError } from '../../src/utils/ApiError.js';
import { safeErrorMeta } from '../../src/utils/safeError.js';
import { assertDemoSeedAllowed } from '../../src/config/security.js';

test('database/provider error details are absent from responses and logs', (t) => {
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args));
  const secret = 'synthetic-secret-never-log';
  const err = Object.assign(new Error(secret), { code: 'ER_ACCESS_DENIED_ERROR', details: { password: secret }, sql: secret });
  let status, body;
  errorHandler(err, {}, { type() { return this; }, status(value) { status = value; return this; }, json(value) { body = value; } });
  assert.equal(status, 500);
  assert.deepEqual(body, { error: 'Internal server error' });
  assert.ok(!JSON.stringify(logs).includes(secret));
  assert.deepEqual(safeErrorMeta(err), { code: 'ER_ACCESS_DENIED_ERROR' });
});
test('safe validation errors remain actionable but malformed status values are sanitized', (t) => {
  t.mock.method(console, 'error', () => {});
  let status, body;
  const res = { type() { return this; }, status(value) { status = value; return this; }, json(value) { body = value; } };
  errorHandler(ApiError.badRequest('Choose a PDF.', { file: ['Invalid file'] }), {}, res);
  assert.equal(status, 400);
  assert.equal(body.error, 'Choose a PDF.');
  assert.deepEqual(body.details, { file: ['Invalid file'] });
  errorHandler(Object.assign(new Error('not public'), { status: 12345 }), {}, res);
  assert.equal(status, 500);
  assert.deepEqual(body, { error: 'Internal server error' });
});
test('known-password demo seeds cannot run in production', () => {
  assert.throws(() => assertDemoSeedAllowed({ NODE_ENV: 'production' }), /disabled/);
  assert.doesNotThrow(() => assertDemoSeedAllowed({ NODE_ENV: 'test' }));
});

test('file errors return JSON before headers are sent and delegate after streaming starts', () => {
  let type = 'application/pdf';
  let body;
  const error = ApiError.notFound('File not found');
  errorHandler(error, {}, {
    type(value) { type = value; return this; },
    status() { return this; },
    json(value) { body = value; },
  });
  assert.equal(type, 'application/json');
  assert.deepEqual(body, { error: 'File not found' });
  let forwarded;
  errorHandler(error, {}, { headersSent: true }, (value) => { forwarded = value; });
  assert.equal(forwarded, error);
});
