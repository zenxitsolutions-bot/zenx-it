import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/db/pool.js';
import { env } from '../../src/config/env.js';
import { toPublicAccount, toPublicApplication } from '../../src/utils/publicAccount.js';

// No real mirrored DB/email transport may be created by the controller imports below.
env.wellnessMysqlUrl = '';
env.emailTransport = 'console';
const staff = await import('../../src/controllers/adminUsers.controller.js');
const customer = await import('../../src/controllers/customerAuth.controller.js');
const company = await import('../../src/controllers/company.controller.js');
const application = await import('../../src/controllers/application.controller.js');
const { provisionCustomerAccount } = await import('../../src/controllers/provisioning.controller.js');

const account = { id: 'account', first_name: 'Test', email: 'test@example.test', password_hash: 'private-password-hash',
  refresh_token: 'private-refresh', access_token: 'private-access', token_hash: 'private-reset', refresh_token_version: 42 };
const appRow = { id: 'app', name: 'App', slug: 'app', description: 'App description', url: 'https://example.test', created_at: '2026-01-01', handoff_secret: 'private-handoff' };
async function invoke(handler, req = {}) {
  const result = {};
  const res = { json(body) { result.body = body; return this; }, status(value) { result.status = value; return this; }, send() {} };
  await handler({ headers: {}, ...req }, res, (error) => { result.error = error; });
  assert.equal(result.error, undefined);
  assert.doesNotMatch(JSON.stringify(result.body), /private-|password_hash|refresh_token|access_token|handoff_secret|token_hash/);
  return result.body;
}

test('account/application serializers omit authentication internals without changing model rows', () => {
  assert.deepEqual(toPublicAccount(account), { id: 'account', first_name: 'Test', email: 'test@example.test' });
  assert.ok(account.password_hash);
  assert.equal(toPublicApplication(appRow).handoff_secret, undefined);
  assert.equal(toPublicApplication(appRow).url, appRow.url);
  assert.ok(appRow.handoff_secret);
});

test('staff list and edit responses contain no password hashes or raw authentication tokens', async (t) => {
  t.mock.method(pool, 'query', async (sql) => sql.startsWith('SELECT') ? [[account]] : [{ affectedRows: 1 }]);
  assert.equal((await invoke(staff.listAdminUsers))[0].id, 'account');
  assert.equal((await invoke(staff.patchAdminUser, { params: { id: 'account' }, body: { role: 'Sales' } })).id, 'account');
});

test('customer identity and company account listing omit authentication internals', async (t) => {
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM application_access')) return [[{ id: 'grant', user_id: 'account', company_id: 'company' }]];
    if (sql.includes('FROM users')) return [[account]];
    throw new Error('Unexpected query: ' + sql);
  });
  assert.equal((await invoke(customer.me, { customer: account })).user.id, 'account');
  assert.equal((await invoke(company.getCompanyUsers, { params: { id: 'company' } }))[0].id, 'account');
});

test('application list/edit and customer launcher never expose handoff signing secrets', async (t) => {
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.startsWith('UPDATE')) return [{ affectedRows: 1 }];
    if (sql.includes('FROM application_access')) return [[{ company_id: 'company', application: 'app', status: 'ACTIVE' }]];
    if (sql.includes('FROM companies')) return [[{ id: 'company', company_name: 'Company' }]];
    if (sql.includes('FROM applications')) return [[appRow]];
    throw new Error('Unexpected query: ' + sql);
  });
  assert.equal((await invoke(application.getApplications))[0].url, appRow.url);
  assert.equal((await invoke(application.patchApplicationUrl, { params: { id: 'app' }, body: { url: appRow.url } })).url, appRow.url);
  assert.equal((await invoke(customer.getActiveGrants, { customer: account, customerCompanyId: 'company' }))[0].application.url, appRow.url);
});

test('customer provisioning response sanitizes the newly created nested account', async (t) => {
  t.mock.method(console, 'log', () => {});
  const companyRow = { id: 'company', company_name: 'Test Company', company_slug: 'test-company' };
  const query = async (sql) => {
    if (sql.includes('WHERE company_slug') || sql.includes('WHERE email')) return [[]];
    if (sql.startsWith('INSERT')) return [{ affectedRows: 1 }];
    if (sql.includes('FROM companies')) return [[companyRow]];
    if (sql.includes('FROM users')) return [[account]];
    throw new Error('Unexpected query: ' + sql);
  };
  t.mock.method(pool, 'query', query);
  t.mock.method(pool, 'getConnection', async () => ({ query, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {} }));
  const result = await invoke(provisionCustomerAccount, { staff: { id: 'staff' }, body: {
    companyName: 'Test Company', companySlug: 'test-company', firstName: 'Test', lastName: 'Person',
    email: 'test@example.test', applicationSlugs: [], password: 'Synthetic-Test-Only-123!',
  } });
  assert.equal(result.user.id, 'account');
  assert.equal(result.company.id, 'company');
  assert.deepEqual(result.grants, []);
});
