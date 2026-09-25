import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('company URL display and clipboard use the API-resolved URL, not the admin window origin', async () => {
  const source = await readFile(new URL('../src/pages/customers/CustomerDetailPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /company\.customer_login_url \|\|/);
  assert.match(source, /disabled=\{!company\.customer_login_url\}/);
  assert.match(source, /await navigator\.clipboard\.writeText\(company\.customer_login_url\)/);
  assert.doesNotMatch(source, /window\.location\.origin/);
  assert.match(source, /Could not copy the link/);
});
