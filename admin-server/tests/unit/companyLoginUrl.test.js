import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { env } from '../../src/config/env.js';
import { pool } from '../../src/db/pool.js';
import { resolveCompanyLoginUrl } from '../../src/services/companyLoginUrl.js';
import { sendCustomerWelcomeEmail } from '../../src/emails/sendCustomerWelcomeEmail.js';

env.wellnessMysqlUrl = '';
const { getCompany } = await import('../../src/controllers/company.controller.js');
const expected = 'https://dietitian.zenxitsolutions.com/divyatest/login';

function fixture(t, appUrl = 'https://dietitian.zenxitsolutions.com/') {
  const original = { nodeEnv: env.nodeEnv, clientOrigins: env.clientOrigins, zenxDietitianUrl: env.zenxDietitianUrl };
  Object.assign(env, { nodeEnv: 'production', clientOrigins: ['https://admin.zenxitsolutions.com'], zenxDietitianUrl: '' });
  t.after(() => Object.assign(env, original));
  const queries = [];
  t.mock.method(pool, 'query', async (sql, values) => {
    queries.push({ sql, values });
    assert.match(sql, /FROM applications/);
    assert.deepEqual(values, ['zenx-dietitian']);
    return [[{ url: appUrl }]];
  });
  return queries;
}

test('Dietitian company links use the configured application host, including mixed and disabled grants', async (t) => {
  fixture(t);
  for (const applicationSlugs of [['zenx-dietitian'], ['zenx-pos', 'zenx-dietitian'], ['zenx-dietitian', 'zenx-dietitian']]) {
    assert.equal(await resolveCompanyLoginUrl({ companySlug: 'divyatest', applicationSlugs }), expected);
  }
});

test('other application customers retain the ZenX launcher and require no Dietitian lookup', async (t) => {
  const queries = fixture(t);
  assert.equal(await resolveCompanyLoginUrl({ companySlug: 'shop', applicationSlugs: ['zenx-pos'] }), 'https://admin.zenxitsolutions.com/shop/login');
  assert.equal(queries.length, 0);
});

test('configured URL strips old paths, query and fragments and encodes the company slug', async (t) => {
  fixture(t, 'https://dietitian.zenxitsolutions.com/old/login?token=discard#discard');
  assert.equal(await resolveCompanyLoginUrl({ companySlug: 'divyatest', applicationSlugs: ['zenx-dietitian'] }), expected);
  assert.equal(await resolveCompanyLoginUrl({ companySlug: 'a/b?x', applicationSlugs: ['zenx-dietitian'] }), 'https://dietitian.zenxitsolutions.com/a%2Fb%3Fx/login');
});

test('development uses the configured localhost application, not the localhost admin port', async (t) => {
  fixture(t, 'http://localhost:5173');
  env.nodeEnv = 'development';
  assert.equal(await resolveCompanyLoginUrl({ companySlug: 'divyatest', applicationSlugs: ['zenx-dietitian'] }), 'http://localhost:5173/divyatest/login');
});

test('missing application URL can use explicit server config but never guesses the admin host', async (t) => {
  fixture(t, null);
  const input = { companySlug: 'divyatest', applicationSlugs: ['zenx-dietitian'] };
  assert.equal(await resolveCompanyLoginUrl(input), null);
  env.zenxDietitianUrl = 'https://dietitian.zenxitsolutions.com';
  assert.equal(await resolveCompanyLoginUrl(input), expected);
});

for (const value of ['javascript:alert(1)', '/relative', 'https://user:password@example.test', 'http://dietitian.example.test']) {
  test('invalid or insecure production URL is unavailable: ' + value.split(':')[0], async (t) => {
    fixture(t, value);
    assert.equal(await resolveCompanyLoginUrl({ companySlug: 'divyatest', applicationSlugs: ['zenx-dietitian'] }), null);
  });
}

test('missing and dot company slugs never create unscoped login links', async (t) => {
  const queries = fixture(t);
  for (const companySlug of ['', undefined, '.', '..']) assert.equal(await resolveCompanyLoginUrl({ companySlug, applicationSlugs: ['zenx-dietitian'] }), null);
  assert.equal(queries.length, 0);
});

test('company detail response supplies the same copyable URL without application secrets', async (t) => {
  fixture(t);
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM companies')) return [[{ id: 'company', company_slug: 'divyatest' }]];
    if (sql.includes('FROM application_access')) return [[{ application: 'zenx-dietitian', status: 'DISABLED' }]];
    if (sql.includes('FROM applications')) return [[{ url: 'https://dietitian.zenxitsolutions.com', handoff_secret: 'synthetic-private-value' }]];
    assert.fail(sql);
  });
  let result;
  await getCompany({ params: { id: 'company' } }, { json: (body) => { result = body; } }, (error) => { throw error; });
  assert.equal(result.customer_login_url, expected);
  assert.doesNotMatch(JSON.stringify(result), /synthetic-private-value|handoff_secret/);
});

test('welcome HTML and text use direct Dietitian URL; missing config sends no misleading email', async (t) => {
  fixture(t);
  const original = { emailTransport: env.emailTransport, smtpHost: env.smtpHost };
  Object.assign(env, { emailTransport: 'smtp', smtpHost: 'smtp.example.invalid' });
  t.after(() => Object.assign(env, original));
  const messages = [];
  t.mock.method(nodemailer, 'createTransport', () => ({ sendMail: async (message) => messages.push(message) }));
  const input = { to: 'test@example.test', name: '<Admin>', companyName: 'Test', companySlug: 'divyatest', applicationSlugs: ['zenx-dietitian'] };
  await sendCustomerWelcomeEmail(input);
  assert.equal(messages.length, 1);
  assert.ok(messages[0].text.includes(expected));
  assert.ok(messages[0].html.includes(`href="${expected}"`));
  assert.doesNotMatch(messages[0].html + messages[0].text, /admin\.zenxitsolutions\.com/);
  assert.match(messages[0].html, /&lt;Admin&gt;/);
  t.mock.method(pool, 'query', async () => [[]]);
  await assert.rejects(sendCustomerWelcomeEmail(input), { code: 'ERR_CUSTOMER_LOGIN_URL' });
  assert.equal(messages.length, 1);
});
