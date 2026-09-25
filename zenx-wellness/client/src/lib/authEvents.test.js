import test from 'node:test';
import assert from 'node:assert/strict';
import { notifySessionEnded, onSessionEnded, notifyPasswordChangeRequired, onPasswordChangeRequired } from '../api/authEvents.js';

test('session-ended notification is local and is removed when the auth provider unmounts', () => {
  let ended = 0;
  const stop = onSessionEnded(() => { ended += 1; });
  notifySessionEnded();
  assert.equal(ended, 1);
  stop();
  notifySessionEnded();
  assert.equal(ended, 1);
});

test('cleanup from a replaced provider cannot remove the new session or password listener', () => {
  let current = 0;
  const oldSession = onSessionEnded(() => assert.fail('stale handler'));
  const newSession = onSessionEnded(() => { current += 1; });
  oldSession();
  notifySessionEnded();
  const oldPassword = onPasswordChangeRequired(() => assert.fail('stale handler'));
  const newPassword = onPasswordChangeRequired(() => { current += 1; });
  oldPassword();
  notifyPasswordChangeRequired();
  assert.equal(current, 2);
  newSession();
  newPassword();
});
