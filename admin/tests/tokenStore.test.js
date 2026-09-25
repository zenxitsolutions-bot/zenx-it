import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Compile in memory so this test also runs on the supported Node 20 runtime (no TS loader).
const source = await readFile(new URL('../src/lib/tokenStore.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { beginAuthTransition, getAuthGeneration, getAuthSignal, canRefreshSession, getStaffAccessToken, setStaffAccessToken, getCustomerAccessToken, setCustomerAccessToken } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('late staff refresh cannot overwrite a newer login token', async () => {
  const old = beginAuthTransition();
  let complete = () => {};
  const pending = new Promise((resolve) => { complete = resolve; }).then((token) => setStaffAccessToken(token, old));
  const current = beginAuthTransition();
  assert.equal(setStaffAccessToken('synthetic-new-staff', current), true);
  complete('synthetic-old-refresh');
  assert.equal(await pending, false);
  assert.equal(getStaffAccessToken(), 'synthetic-new-staff');
});

test('logout immediately aborts staff requests and disables further cookie refresh', () => {
  const signal = getAuthSignal();
  beginAuthTransition();
  assert.equal(signal.aborted, true);
  assert.equal(getAuthSignal().aborted, false);
  assert.equal(getStaffAccessToken(), null);
  assert.equal(canRefreshSession(), false);
});

test('staff and customer auth generations are independent', () => {
  const customer = beginAuthTransition(true);
  const signal = getAuthSignal(true);
  setCustomerAccessToken('synthetic-customer', customer);
  beginAuthTransition();
  assert.equal(signal.aborted, false);
  assert.equal(getAuthGeneration(true), customer);
  assert.equal(getCustomerAccessToken(), 'synthetic-customer');
  assert.equal(canRefreshSession(true), true);
});

test('customer logout rejects stale login and password-change credentials', () => {
  const old = getAuthGeneration(true);
  beginAuthTransition(true);
  assert.equal(setCustomerAccessToken('synthetic-stale', old), false);
  assert.equal(getCustomerAccessToken(), null);
  assert.equal(canRefreshSession(true), false);
});
