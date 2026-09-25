import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../../src/config/env.js';
import { sendEmail } from '../../src/emails/sendEmail.js';
import { sendStaffInviteEmail } from '../../src/emails/sendStaffInviteEmail.js';
import { sendCustomerWelcomeEmail } from '../../src/emails/sendCustomerWelcomeEmail.js';

test('console transport never logs invitations, reset links or email bodies', async (t) => {
  const logs = [];
  const original = env.emailTransport;
  env.emailTransport = 'console';
  t.mock.method(console, 'log', (...args) => logs.push(args.join(' ')));
  try {
    await sendEmail({ to: 'private@example.com', subject: 'Reset', html: '<a href="https://x/?token=secret">Reset</a>', text: 'secret' });
    assert.equal(logs.length, 1);
    assert.doesNotMatch(logs.join(' '), /secret|private@example.com|token=/);
    assert.match(logs[0], /suppressed/);
  } finally { env.emailTransport = original; }
});

test('SMTP errors never expose provider messages and welcome/invite content is HTML-escaped', async (t) => {
  const logs = [];
  const messages = [];
  let fail = false;
  const original = { emailTransport: env.emailTransport, smtpHost: env.smtpHost };
  env.emailTransport = 'smtp';
  env.smtpHost = 'smtp.example.invalid';
  t.mock.method(console, 'error', (...args) => logs.push(args.join(' ')));
  t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async (message) => {
      messages.push(message);
      if (fail) throw new Error('SMTP echoed password=secret and reset?token=raw-secret');
    },
  }));
  try {
    await sendStaffInviteEmail({ to: 'invite@example.com', name: '<img src=x onerror=alert(1)>', token: 'token-with-&-quotes"' });
    await sendCustomerWelcomeEmail({ to: 'customer@example.com', name: '<script>alert(1)</script>', companyName: '<script>company</script>', companySlug: 'company' });
    for (const message of messages) assert.doesNotMatch(message.html, /<img src=x|<script>/);
    assert.match(messages[0].html, /&lt;img/);
    assert.match(messages[0].html, /token-with-%26-quotes%22/);
    assert.match(messages[1].html, /&lt;script&gt;/);
    fail = true;
    await assert.rejects(sendEmail({ to: 'customer@example.com', subject: 'Reset', text: 'secret' }), { message: 'SMTP send failed' });
    assert.doesNotMatch(logs.join(' '), /secret|raw-secret|password=/);
  } finally { Object.assign(env, original); }
});

test('Resend transport exceptions do not escape with credential-bearing provider data', async (t) => {
  const original = { emailTransport: env.emailTransport, resendApiKey: env.resendApiKey };
  env.emailTransport = 'resend';
  env.resendApiKey = 'test-key-not-a-real-credential';
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args.join(' ')));
  // Override the SDK's local fetch method; no network request is performed.
  t.mock.method(Resend.prototype, 'post', async () => { throw new Error('Provider request included reset?token=raw-secret'); });
  try {
    await assert.rejects(sendEmail({ to: 'private@example.com', subject: 'Reset', text: 'secret' }), { message: 'Resend send failed' });
    assert.doesNotMatch(logs.join(' '), /raw-secret|private@example.com/);
  } finally { Object.assign(env, original); }
});
