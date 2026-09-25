import test from 'node:test';
import assert from 'node:assert/strict';
import { requiredEnv, secretEnv, assertDistinctSecrets, parseTrustProxy, originList, boundedInteger } from '../../src/config/security.js';

test('production requires explicit HTTPS browser origins and never echoes sensitive URLs', () => {
  assert.throws(() => originList('CLIENT_ORIGIN', 'http://localhost:5173', { source: { NODE_ENV: 'production' } }), /CLIENT_ORIGIN/);
  for (const entry of ['http://example.com', 'https://example.com/path', 'https://example.com?token=synthetic-secret', 'https://user:synthetic-secret@example.com', '*', 'https://example.com#fragment']) {
    assert.throws(() => originList('CLIENT_ORIGIN', '', { source: { NODE_ENV: 'production', CLIENT_ORIGIN: entry } }), (error) => !error.message.includes('synthetic-secret'));
  }
  assert.deepEqual(originList('CLIENT_ORIGINS', '', { source: { NODE_ENV: 'production', CLIENT_ORIGINS: 'https://example.com/, https://example.com' } }), ['https://example.com']);
  assert.deepEqual(originList('EXTRA', '', { source: { NODE_ENV: 'production' }, required: false }), []);
  assert.deepEqual(originList('CLIENT_ORIGIN', 'http://localhost:5173', { source: {} }), ['http://localhost:5173']);
  assert.throws(() => originList('CLIENT_ORIGIN', '', { source: { CLIENT_ORIGIN: 'https://one.test,https://two.test' }, single: true }), /one origin/);
});
test('reset-link lifetime must be a positive bounded integer', () => {
  assert.equal(boundedInteger('TTL', 60, { source: {} }), 60);
  for (const value of ['0', '-1', 'Infinity', 'NaN', '1.5', '1441', '']) {
    assert.throws(() => boundedInteger('TTL', 60, { source: { TTL: value } }), /TTL/);
  }
});


const good = 'b92f38e46cd701a59ed6a3420f1bdc872b3498da56ec4f19';

test('development defaults remain usable, but production never falls back', () => {
  assert.equal(requiredEnv('MYSQL_URL', 'development-db', {}), 'development-db');
  assert.throws(() => requiredEnv('MYSQL_URL', 'development-db', { NODE_ENV: 'production' }), /MYSQL_URL/);
  assert.throws(() => requiredEnv('MYSQL_URL', 'development-db', { MYSQL_URL: ' ' }), /MYSQL_URL/);
});
test('production rejects short, placeholder and low-entropy signing secrets without echoing them', () => {
  for (const value of ['', 'short', 'dev-access-secret-change-me', 'x'.repeat(64), 'replace-this-with-your-random-generated-secret']) {
    assert.throws(() => secretEnv('JWT_SECRET', 'fallback', { NODE_ENV: 'production', JWT_SECRET: value }));
  }
  assert.equal(secretEnv('JWT_SECRET', 'fallback', { NODE_ENV: 'production', JWT_SECRET: good }), good);
});
test('production separates access, refresh and account-realm secrets', () => {
  assert.throws(() => assertDistinctSecrets([good, good], { NODE_ENV: 'production' }), /distinct/);
  assert.doesNotThrow(() => assertDistinctSecrets([good, good + 'different'], { NODE_ENV: 'production' }));
  assert.doesNotThrow(() => assertDistinctSecrets([good, good], {}));
});
test('reverse proxy trust is disabled by default and only accepts explicit networks', () => {
  assert.equal(parseTrustProxy(), false);
  assert.equal(parseTrustProxy('false'), false);
  assert.deepEqual(parseTrustProxy('loopback, 10.0.1.0/24, ::1'), ['loopback', '10.0.1.0/24', '::1']);
  for (const value of ['true', '1', '*', '0.0.0.0/0', '::/0', '10.0.0.1/33', '::1/129', '127.0.0.1,', 'host.invalid', '127.0.0.1/-1']) {
    assert.throws(() => parseTrustProxy(value), /TRUST_PROXY/, value);
  }
});
