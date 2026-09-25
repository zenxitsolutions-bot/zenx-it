import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeQueueParams, publicEmailLog, welcomeQueueParams, isSensitiveMessage } from '../../src/emails/security.js';
import { prepareWelcomeDelivery } from '../../src/emails/welcomeDelivery.js';
import { hashResetToken } from '../../src/models/PasswordResetToken.js';
import { renderTemplate } from '../../src/emails/renderTemplate.js';
import { sendViaConsole } from '../../src/emails/transport/consoleTransport.js';
import { processOne } from '../../src/emails/worker.js';
import { sendEmail } from '../../src/emails/sendEmail.js';
import { enqueueEmail, markEmailRetryOrFailed } from '../../src/models/EmailLog.js';
import { pool } from '../../src/db/pool.js';
import { listEmails, getEmail, resendEmail } from '../../src/controllers/emailLog.controller.js';
import { SAMPLE_DATA } from '../../src/emails/sampleData.js';

const params = {
  client_name: 'Client', company_name: 'Company', dietitian_name: 'Dietitian',
  plan_name: 'Plan', plan_duration: '3 months', login_url: 'https://app.example/company/login',
};
const row = { id: 'welcome-1', to: 'client@example.com', templateKey: 'client-welcome', params,
  relatedEntity: { type: 'client', id: 'client-1' }, attempts: 0, maxAttempts: 3 };
const user = { id: 'client-1', name: 'Client', email: row.to, role: 'client', accountStatus: 'active', companyId: 'company-1' };
const company = { id: 'company-1', name: 'Company', status: 'ACTIVE', slug: 'company' };
function deliveryDependencies(overrides = {}) {
  return {
    findUserById: async () => user,
    findCompanyById: async () => company,
    createPasswordResetToken: async () => {},
    randomToken: () => 'ephemeral-token', now: () => 100000,
    env: { clientOrigin: 'https://app.example/', passwordResetTokenTtlMinutes: 60 },
    ...overrides,
  };
}

test('all templates render and ordinary notification samples remain queue-compatible', () => {
  for (const [template, sample] of Object.entries(SAMPLE_DATA)) {
    assert.doesNotThrow(() => renderTemplate(template, sample), template);
    if (!['client-welcome', 'password-reset'].includes(template)) {
      assert.doesNotThrow(() => assertSafeQueueParams(sample), template);
    }
  }
});

test('queue rejects credential fields and credential links even when nested', () => {
  for (const secret of [
    { temp_password: 'secret' }, { nested: { reset_url: 'secret' } }, { access_token: 'secret' }, { accessToken: 'secret' },
    { arbitrary: 'https://app.example/reset?token=secret' }, { nested: [{ href: 'https://a/?token=secret' }] },
  ]) assert.throws(() => assertSafeQueueParams(secret));
  assert.doesNotThrow(() => assertSafeQueueParams(params));
  assert.deepEqual(welcomeQueueParams({ ...params, temp_password: 'legacy', reset_url: 'token' }), params);
});

test('public email log hides legacy params, idempotency keys, provider data and raw errors', () => {
  const result = publicEmailLog({ ...row, params: { temp_password: 'legacy-secret' },
    error: 'SMTP body https://app/reset?token=raw-secret', idempotencyKey: 'token', providerMessageId: 'secret' });
  assert.equal(result.params, undefined);
  assert.equal(result.idempotencyKey, undefined);
  assert.equal(result.providerMessageId, undefined);
  assert.doesNotMatch(JSON.stringify(result), /legacy-secret|raw-secret|SMTP body/);
  assert.equal(result.to, row.to);
});

test('welcome delivery stores only a hash and gives its recipient a correctly expiring set-password link', async () => {
  const stored = [];
  const original = { ...row, params: { ...params, temp_password: 'legacy-secret' } };
  const ready = await prepareWelcomeDelivery(original, deliveryDependencies({ createPasswordResetToken: async (entry) => stored.push(entry) }));
  assert.deepEqual(stored, [{ userId: user.id, tokenHash: hashResetToken('ephemeral-token'), expiresAt: new Date(3700000) }]);
  assert.equal(ready.set_password_url, 'https://app.example/company/reset-password?token=ephemeral-token');
  assert.equal(ready.expiry_label, '1 hour');
  assert.equal(ready.temp_password, undefined);
  assert.equal(original.params.temp_password, 'legacy-secret', 'legacy records are not mutated by rendering');
  const message = renderTemplate('client-welcome', ready);
  assert.match(message.text, /can only be used once/);
  assert.doesNotMatch(message.text + message.html, /legacy-secret|Temporary password/);
  assert.ok(!JSON.stringify(stored).includes('ephemeral-token'));
});

test('welcome delivery refuses stale, suspended, cross-recipient and inactive-company jobs before minting tokens', async () => {
  for (const candidate of [null, { ...user, email: 'different@example.com' }, { ...user, role: 'admin' },
    { ...user, accountStatus: 'suspended' }, { ...user, accountStatus: 'inactive' }, { ...user, companyId: null }]) {
    await assert.rejects(prepareWelcomeDelivery(row, deliveryDependencies({ findUserById: async () => candidate,
      createPasswordResetToken: async () => assert.fail('must not issue token') })));
  }
  await assert.rejects(prepareWelcomeDelivery(row, deliveryDependencies({ findCompanyById: async () => ({ ...company, status: 'INACTIVE' }),
    createPasswordResetToken: async () => assert.fail('must not issue token') })));
  await assert.rejects(prepareWelcomeDelivery({ ...row, relatedEntity: null }, deliveryDependencies()));
});

test('queue write retains no welcome password/token and defensive model rejects direct secrets', async (t) => {
  const inserts = [];
  t.mock.method(pool, 'query', async (sql, values) => {
    if (sql.startsWith('INSERT INTO email_log')) { inserts.push(values); return [{}]; }
    if (sql.startsWith('SELECT * FROM email_log')) return [[{ id: inserts[0][0], params: JSON.parse(inserts[0][5]) }]];
    assert.fail('unexpected database query');
  });
  await sendEmail(row.to, 'client-welcome', { ...params, temp_password: 'discard-me' }, { relatedEntity: row.relatedEntity });
  assert.equal(inserts.length, 1);
  assert.deepEqual(JSON.parse(inserts[0][5]), params);
  assert.doesNotMatch(JSON.stringify(inserts), /discard-me|token=|set_password_url/);
  await assert.rejects(enqueueEmail({ params: { token: 'secret' } }));
  await assert.rejects(sendEmail(row.to, 'password-reset', { reset_url: 'https://x/?token=secret' }));
  assert.equal(inserts.length, 1);
});

test('failed welcome retries generate fresh links and never persist or log rendered secrets', async (t) => {
  const attempts = [];
  const delivered = [];
  const stored = [];
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args.join(' ')));
  let counter = 0;
  const deps = {
    prepareWelcomeDelivery: (entry) => prepareWelcomeDelivery(entry, deliveryDependencies({
      randomToken: () => `attempt-secret-${++counter}`, createPasswordResetToken: async (token) => stored.push(token),
    })),
    sendViaTransport: async (message) => {
      delivered.push(message);
      if (counter === 1) throw new Error(`Provider included body: ${message.text}`);
      return { providerMessageId: 'delivered' };
    },
    markEmailSent: async (id, providerId) => attempts.push({ id, providerId }),
    markEmailRetryOrFailed: async (id, failure) => attempts.push({ id, ...failure }),
  };
  await processOne(row, deps);
  assert.equal(attempts[0].attempts, 1);
  assert.equal(attempts[0].maxAttempts, 3);
  assert.ok(attempts[0].nextAttemptAt instanceof Date);
  await processOne({ ...row, attempts: 1 }, deps);
  assert.equal(delivered.length, 2);
  assert.match(delivered[0].text, /attempt-secret-1/);
  assert.match(delivered[1].text, /attempt-secret-2/);
  assert.ok(delivered.every((message) => message.sensitive === true));
  assert.equal(attempts[1].providerId, 'delivered');
  assert.doesNotMatch(JSON.stringify({ attempts, logs, stored, row }), /attempt-secret-|Provider included body/);
});

test('model records safe retry errors even when caller passes a sensitive exception', async (t) => {
  const writes = [];
  t.mock.method(pool, 'query', async (sql, values) => {
    if (sql.startsWith('UPDATE')) { writes.push(values); return [{}]; }
    return [[]];
  });
  await markEmailRetryOrFailed('id', { error: 'password=secret', attempts: 3, maxAttempts: 3, nextAttemptAt: new Date() });
  assert.equal(writes[0][0], 'failed');
  assert.doesNotMatch(JSON.stringify(writes), /secret/);
});

test('legacy credential-bearing non-welcome jobs fail closed without sending or exposing raw tokens', async (t) => {
  const logs = [];
  const failures = [];
  t.mock.method(console, 'error', (...args) => logs.push(args.join(' ')));
  await processOne({ ...row, templateKey: 'password-reset', params: { reset_url: 'https://x/?token=legacy-raw-secret' } }, {
    sendViaTransport: async () => assert.fail('must not send a retained legacy token'),
    markEmailSent: async () => assert.fail('must not mark sent'),
    markEmailRetryOrFailed: async (id, failure) => failures.push({ id, ...failure }),
  });
  assert.equal(failures.length, 1);
  assert.equal(failures[0].attempts, 1);
  assert.doesNotMatch(JSON.stringify({ failures, logs }), /legacy-raw-secret|reset_url/);
});

test('sensitive console transport never writes credential-bearing previews', async (t) => {
  const logs = [];
  t.mock.method(console, 'log', (...args) => logs.push(args.join(' ')));
  assert.equal(isSensitiveMessage({ text: 'https://x/reset?token=raw-secret' }), true);
  await sendViaConsole({ to: row.to, subject: 'Reset', html: '<a href="https://x/?token=raw-secret">Reset</a>', text: 'raw-secret', sensitive: true });
  assert.equal(logs.length, 1);
  assert.doesNotMatch(logs[0], /raw-secret|client@example.com/);
  assert.match(logs[0], /suppressed/);
});

test('email list, detail and resend APIs hide legacy credentials while retaining company checks', async (t) => {
  const legacy = { id: 'legacy-1', to_email: row.to, template_key: 'client-welcome',
    params: { temp_password: 'legacy-secret', reset_url: 'https://x/?token=raw-secret' },
    related_entity_type: 'client', related_entity_id: user.id, status: 'failed',
    error: 'SMTP included password legacy-secret', idempotency_key: 'raw-secret', attempts: 3, max_attempts: 3 };
  const queries = [];
  t.mock.method(pool, 'query', async (sql, values) => {
    queries.push(sql);
    if (sql.includes('FROM email_log el')) {
      assert.ok(values.slice(0, 3).every((id) => id === user.companyId));
      assert.doesNotMatch(sql, /SELECT el\.\*/);
      return [[legacy]];
    }
    if (sql.startsWith('SELECT * FROM email_log')) return [[legacy]];
    if (sql.includes('FROM users u')) return [[{ id: user.id, company_id: user.companyId }]];
    if (sql.startsWith('UPDATE email_log')) return [{}];
    assert.fail('unexpected database query');
  });
  t.mock.method(pool, 'getConnection', async () => ({
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    query: async (sql) => { assert.match(sql, /FOR UPDATE SKIP LOCKED/); return [[]]; },
  }));
  const req = { user: { companyId: user.companyId }, query: {}, params: { id: legacy.id } };
  for (const handler of [listEmails, getEmail, resendEmail]) {
    let response;
    await handler(req, { json: (body) => { response = body; } }, (error) => { throw error; });
    assert.ok(response);
    assert.doesNotMatch(JSON.stringify(response), /legacy-secret|raw-secret|temp_password|reset_url|idempotencyKey|providerMessageId/);
  }
  let denied;
  await getEmail({ ...req, user: { companyId: 'other-company' } }, { json: () => assert.fail('must not return cross-company log') }, (error) => { denied = error; });
  assert.equal(denied.status, 404);
  assert.ok(queries.some((sql) => sql.includes("SET status = 'queued', attempts = 0")), 'manual retry still requeues existing row');
});
