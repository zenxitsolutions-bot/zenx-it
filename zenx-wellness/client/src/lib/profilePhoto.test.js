import assert from 'node:assert/strict';
import test from 'node:test';
import { profileInitial, profilePhotoKey, profileUserId } from './profilePhoto.js';

test('profile photo keys are scoped to viewer and target, not just the target', () => {
  assert.deepEqual(profilePhotoKey({ _id: 'client-1' }, 'dietitian-2'), ['profile-photo', 'client-1', 'dietitian-2']);
  assert.notDeepEqual(profilePhotoKey('client-1', 'dietitian-2'), profilePhotoKey('client-3', 'dietitian-2'));
  assert.deepEqual(profilePhotoKey('client-1', null), ['profile-photo', 'client-1', null]);
});

test('normalises populated references and keeps missing users missing', () => {
  assert.equal(profileUserId({ _id: 'dietitian-2' }), 'dietitian-2');
  assert.equal(profileUserId({ id: 12 }), '12');
  for (const value of [undefined, null, '', ' ', {}, false]) assert.equal(profileUserId(value), null);
});

test('fallback initials support empty names and Unicode', () => {
  assert.equal(profileInitial('  divya  '), 'D');
  assert.equal(profileInitial(null), '?');
  assert.equal(profileInitial('🙂 Example'), '🙂');
});
