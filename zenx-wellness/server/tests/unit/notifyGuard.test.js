import test from 'node:test';
import assert from 'node:assert/strict';
import { canNotifyUser } from '../../src/services/notifyGuard.js';

test('canNotifyUser allows an active user and a bare enquiry contact', () => {
  assert.equal(canNotifyUser({ email: 'a@example.com', accountStatus: 'active' }), true);
  assert.equal(canNotifyUser({ email: 'lead@example.com', name: 'Lead' }), true);
});

test('canNotifyUser blocks inactive, suspended, and missing email', () => {
  assert.equal(canNotifyUser({ email: 'a@example.com', accountStatus: 'inactive' }), false);
  assert.equal(canNotifyUser({ email: 'a@example.com', accountStatus: 'suspended' }), false);
  assert.equal(canNotifyUser({ accountStatus: 'active' }), false);
  assert.equal(canNotifyUser(null), false);
});
