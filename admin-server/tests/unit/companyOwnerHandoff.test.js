import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from '../../src/db/pool.js';
import { env } from '../../src/config/env.js';

// Disable external mirrors and delivery before importing controllers. Every DB call is mocked.
env.wellnessMysqlUrl = '';
env.emailTransport = 'console';
const { issueHandoffToken, login } = await import('../../src/controllers/customerAuth.controller.js');
const { provisionCustomerAccount } = await import('../../src/controllers/provisioning.controller.js');

const secret = 'synthetic-owner-handoff-test-signing-secret';
const customer = { id: 'customer', email: 'customer@example.test', first_name: 'Primary', last_name: 'Admin',
  status: 'ACTIVE', password_hash: 'synthetic-password-hash' };
async function invoke(handler, request) {
  const result = {};
  const response = { json(body) { result.body = body; return this; }, status(status) { result.status = status; return this; }, cookie() {} };
  await handler(request, response, (error) => { result.error = error; });
  return result;
}

function handoffFixture(t, options = {}) {
  const company = { id: 'company', company_slug: 'company', company_name: 'Company', status: options.companyStatus ?? 'ACTIVE',
    main_admin_user_id: Object.hasOwn(options, 'owner') ? options.owner : 'customer' };
  const candidates = options.candidates ?? [{ id: 'customer', user_status: 'ACTIVE', grant_status: 'ACTIVE' }];
  const writes = [];
  const query = async (sql, values) => {
    if (sql.includes('FROM companies')) return [[{ ...company }]];
    if (sql.includes('FROM application_access aa')) return [candidates];
    if (sql.includes('FROM application_access')) {
      assert.deepEqual(values, ['customer', 'company', options.application ?? 'zenx-dietitian']);
      return options.missingGrant ? [[]] : [[{ role: options.role ?? 'wellness_admin', status: options.grantStatus ?? 'ACTIVE' }]];
    }
    if (sql.includes('FROM applications')) return [[{ url: 'https://wellness.example.test', handoff_secret: secret }]];
    if (sql.startsWith('UPDATE companies')) {
      writes.push(values);
      company.main_admin_user_id = values[0];
      return [{ affectedRows: 1 }];
    }
    assert.fail('Unexpected query: ' + sql);
  };
  t.mock.method(pool, 'query', query);
  t.mock.method(pool, 'getConnection', async () => ({ query, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {} }));
  const request = { customer: { ...customer, status: options.customerStatus ?? 'ACTIVE' }, customerCompanyId: 'company',
    body: { applicationSlug: options.application ?? 'zenx-dietitian', companyId: 'forged-company', main_admin_user_id: 'forged-owner', iss: 'forged', aud: 'forged' } };
  return { request, writes, company };
}

function verifyResult(result) {
  assert.equal(result.error, undefined);
  const token = new URL(result.body.url).searchParams.get('token');
  return jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'zenx-admin' });
}

test('handoff signs persisted owner proof and ignores forged request identity or company fields', async (t) => {
  const state = handoffFixture(t);
  const claims = verifyResult(await invoke(issueHandoffToken, state.request));
  assert.equal(claims.sub, 'customer');
  assert.equal(claims.company_id, 'company');
  assert.equal(claims.main_admin_user_id, 'customer');
  assert.equal(claims.aud, 'zenx-dietitian');
  assert.equal(claims.role, 'wellness_admin');
  assert.equal(claims.exp - claims.iat, 60);
  assert.equal(state.writes.length, 0);
});

test('handoff reconciles an unambiguous legacy owner before signing its claim', async (t) => {
  const state = handoffFixture(t, { owner: null });
  const claims = verifyResult(await invoke(issueHandoffToken, state.request));
  assert.equal(claims.main_admin_user_id, 'customer');
  assert.deepEqual(state.writes, [['customer', 'company']]);
});

test('ambiguous legacy grants issue ordinary handoff with no owner proof', async (t) => {
  const state = handoffFixture(t, { owner: null, candidates: [
    { id: 'customer', user_status: 'ACTIVE', grant_status: 'ACTIVE' },
    { id: 'disabled-other-admin', user_status: 'DISABLED', grant_status: 'DISABLED' },
  ] });
  const claims = verifyResult(await invoke(issueHandoffToken, state.request));
  assert.equal(claims.main_admin_user_id, null);
  assert.equal(state.writes.length, 0);
});

test('additional admin cannot replace the established owner through a handoff', async (t) => {
  const state = handoffFixture(t, { owner: 'established-owner' });
  const claims = verifyResult(await invoke(issueHandoffToken, state.request));
  assert.equal(claims.main_admin_user_id, 'established-owner');
  assert.notEqual(claims.main_admin_user_id, claims.sub);
  assert.equal(state.writes.length, 0);
});

test('dietitian handoff retains its non-owner role even if source ownership is already recorded', async (t) => {
  const state = handoffFixture(t, { role: 'dietitian' });
  const claims = verifyResult(await invoke(issueHandoffToken, state.request));
  assert.equal(claims.role, 'dietitian');
  assert.equal(state.writes.length, 0);
});

test('other applications receive their own audience and no Wellness owner proof', async (t) => {
  const state = handoffFixture(t, { application: 'zenx-pos', role: 'pos_admin', owner: null });
  t.mock.method(pool, 'getConnection', async () => assert.fail('Other applications cannot elect a Wellness owner'));
  const claims = verifyResult(await invoke(issueHandoffToken, state.request));
  assert.equal(claims.aud, 'zenx-pos');
  assert.equal(claims.main_admin_user_id, null);
});

test('successful company login recognizes its sole legacy platform admin before issuing the session', async (t) => {
  const password = 'Synthetic-Login-Owner-Test-Only!';
  const account = { ...customer, password_hash: await bcrypt.hash(password, 4) };
  const company = { id: 'company', company_slug: 'company', status: 'ACTIVE', main_admin_user_id: null };
  const events = [];
  const query = async (sql, values) => {
    if (sql.includes('FROM users')) return [[account]];
    if (sql.includes('FROM companies')) return [[{ ...company }]];
    if (sql.includes('FROM application_access aa')) return [[{ id: account.id, user_status: 'ACTIVE', grant_status: 'ACTIVE' }]];
    if (sql.includes('FROM application_access')) return [[{ company_id: company.id, application: 'zenx-dietitian', role: 'wellness_admin', status: 'ACTIVE' }]];
    if (sql.startsWith('UPDATE users SET last_login')) return [{ affectedRows: 1 }];
    if (sql.startsWith('UPDATE companies SET main_admin_user_id')) {
      assert.deepEqual(values, [account.id, company.id]);
      company.main_admin_user_id = account.id;
      events.push('owner-recorded');
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('INSERT INTO auth_sessions')) { events.push('session'); return [{ affectedRows: 1 }]; }
    assert.fail('Unexpected query: ' + sql);
  };
  t.mock.method(pool, 'query', query);
  t.mock.method(pool, 'getConnection', async () => ({ query, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {} }));
  const result = await invoke(login, { body: { email: account.email, password, companySlug: 'company' } });
  assert.equal(result.error, undefined);
  assert.equal(result.body.companyId, company.id);
  assert.equal(result.body.user.id, account.id);
  assert.deepEqual(events, ['owner-recorded', 'session']);
});

for (const [name, options] of [
  ['disabled customer', { customerStatus: 'DISABLED' }],
  ['inactive company', { companyStatus: 'INACTIVE' }],
  ['disabled application grant', { grantStatus: 'DISABLED' }],
  ['missing application grant', { missingGrant: true }],
]) {
  test('handoff rejects ' + name + ' before ownership reconciliation', async (t) => {
    const state = handoffFixture(t, options);
    t.mock.method(pool, 'getConnection', async () => assert.fail('Unauthorized request cannot reconcile ownership'));
    const result = await invoke(issueHandoffToken, state.request);
    assert.equal(result.error?.status, 403);
    assert.equal(result.body, undefined);
    assert.equal(state.writes.length, 0);
  });
}

for (const status of ['ACTIVE', 'INACTIVE']) {
  test('company provisioning records exact owner inside its transaction for ' + status + ' company', async (t) => {
    const events = [];
    const company = { id: 'company', company_name: 'Company', company_slug: 'company', status, main_admin_user_id: null };
    const query = async (sql, values) => {
      if (sql.includes('WHERE company_slug') || sql.includes('WHERE email')) return [[]];
      if (sql.includes('FROM companies')) return [[{ ...company }]];
      if (sql.includes('FROM users')) return [[customer]];
      if (sql.includes('FROM application_access aa')) return [[{ id: customer.id, user_status: 'ACTIVE', grant_status: 'ACTIVE' }]];
      if (sql.includes('FROM application_access')) return [[{ user_id: customer.id, company_id: company.id, application: 'zenx-dietitian', role: 'wellness_admin' }]];
      if (sql.startsWith('UPDATE companies SET main_admin_user_id')) {
        assert.deepEqual(values, [customer.id, company.id]);
        assert.equal(events.includes('commit'), false);
        events.push('owner-recorded');
        company.main_admin_user_id = values[0];
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('INSERT')) return [{ affectedRows: 1 }];
      assert.fail('Unexpected query: ' + sql);
    };
    t.mock.method(console, 'log', () => {});
    t.mock.method(pool, 'query', query);
    t.mock.method(pool, 'getConnection', async () => ({ query,
      beginTransaction: async () => events.push('begin'), commit: async () => events.push('commit'),
      rollback: async () => events.push('rollback'), release() {} }));
    const result = await invoke(provisionCustomerAccount, { staff: { id: 'platform-staff' }, body: {
      companyName: 'Company', companySlug: 'company', firstName: 'Primary', lastName: 'Admin',
      email: customer.email, password: 'Synthetic-Owner-Test-Only-123!', applicationSlugs: ['zenx-dietitian'], status,
      main_admin_user_id: 'forged-owner',
    } });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 201);
    assert.equal(result.body.company.main_admin_user_id, customer.id);
    assert.deepEqual(events, ['begin', 'owner-recorded', 'commit']);
  });
}
