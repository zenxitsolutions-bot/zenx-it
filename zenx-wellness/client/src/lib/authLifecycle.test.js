import test from 'node:test';
import assert from 'node:assert/strict';
import { accountIdentity, clearPrivateCache } from './authLifecycle.js';
import { beginAuthTransition, getAuthGeneration, getAuthSignal, getAccessToken, setAccessToken, canRefreshSession } from '../api/tokenStore.js';

test('logout invalidates pending bootstrap/refresh results and aborts old requests immediately', async () => {
  const signedIn = beginAuthTransition();
  setAccessToken('synthetic-old-session', signedIn);
  assert.equal(canRefreshSession(), true);
  const oldSignal = getAuthSignal();
  let complete;
  const pending = new Promise((resolve) => { complete = resolve; }).then((token) => setAccessToken(token, signedIn));
  beginAuthTransition();
  assert.equal(getAccessToken(), null);
  assert.equal(canRefreshSession(), false, 'late 401s must not refresh the cookie after logout');
  assert.equal(oldSignal.aborted, true);
  assert.equal(getAuthSignal().aborted, false);
  complete('synthetic-late-bootstrap');
  assert.equal(await pending, false);
  assert.equal(getAccessToken(), null);
});

test('only the latest login can commit credentials after an account switch', () => {
  const alice = beginAuthTransition();
  const bob = beginAuthTransition();
  assert.equal(setAccessToken('synthetic-bob-session', bob), true);
  assert.equal(setAccessToken('synthetic-alice-late-session', alice), false);
  assert.equal(getAccessToken(), 'synthetic-bob-session');
  assert.equal(getAuthGeneration(), bob);
  assert.equal(canRefreshSession(), true);
  beginAuthTransition();
});

test('private cache is cancelled and cleared without waiting for cancellation to settle', async () => {
  const actions = [];
  let failCancellation;
  const pending = new Promise((_resolve, reject) => { failCancellation = reject; });
  clearPrivateCache({ cancelQueries() { actions.push('cancel'); return pending; }, clear() { actions.push('clear'); } });
  assert.deepEqual(actions, ['cancel', 'clear']);
  failCancellation(new Error('synthetic cancellation error'));
  await new Promise((resolve) => setTimeout(resolve, 0));
});

test('cache identity separates accounts and companies while preserving same-user profile updates', () => {
  assert.equal(accountIdentity({ _id: 'a', companyId: 'one' }), accountIdentity({ id: 'a', companyId: 'one', timezone: 'Asia/Kolkata' }));
  assert.notEqual(accountIdentity({ _id: 'a', companyId: 'one' }), accountIdentity({ _id: 'a', companyId: 'two' }));
  assert.notEqual(accountIdentity({ _id: 'a', companyId: 'one' }), accountIdentity({ _id: 'b', companyId: 'one' }));
  assert.equal(accountIdentity(null), null);
});

test('a synchronous cancellation error cannot prevent private-cache clearing', () => {
  let cleared = false;
  clearPrivateCache({ cancelQueries() { throw new Error('cancel failed'); }, clear() { cleared = true; } });
  assert.equal(cleared, true);
});
