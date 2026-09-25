import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePassword, hashPassword } from '../../src/utils/password.js';

// Synthetic fixture generated with bcrypt 5.1.1 before upgrading to bcrypt 6.
// This is not an account credential, and it never touches a database.
const samplePassword = 'dependency-compatibility-test-not-a-real-password';
const legacyHash = '$2b$04$kCcrpyZUJWtlKsjzSTrsx.X4o1lQoT8ohXAuuR5QLVs.ImHmDYEcu';

test('bcrypt 6 authenticates existing bcrypt 5 hashes without password resets', async () => {
  assert.equal(await comparePassword(samplePassword, legacyHash), true);
  assert.equal(await comparePassword('incorrect-synthetic-password', legacyHash), false);
});

test('new passwords retain the application work factor and compare correctly', async () => {
  const hash = await hashPassword(samplePassword);
  assert.match(hash, /^\$2[ab]\$12\$/);
  assert.equal(await comparePassword(samplePassword, hash), true);
  assert.equal(await comparePassword('incorrect-synthetic-password', hash), false);
});
