import test from 'node:test';
import assert from 'node:assert/strict';
import { bindStaffRecipientIdentity, privateCalendarParams, preparePermissionDelivery } from '../../src/emails/permissionDelivery.js';
import { buildIcsAttachment } from '../../src/emails/ics.js';
import { calendarAttendeeEmails } from '../../src/services/callMeeting.js';
import { processOne } from '../../src/emails/worker.js';
import { SAMPLE_DATA } from '../../src/emails/sampleData.js';
import { sendEmail } from '../../src/emails/sendEmail.js';
import { pool } from '../../src/db/pool.js';

const staff = (permissions = {}) => ({ id: 'staff-1', companyId: 'company-1', role: 'dietitian', accountStatus: 'active', email: 'staff@example.test',
  permissions: { 'contact.view_email': false, 'calls.view': true, 'diet_plans.view': true, ...permissions } });
const params = { ...SAMPLE_DATA['call-scheduled-dietitian'], recipientUserId: 'staff-1', recipientCompanyId: 'company-1', ics: {
  callId: 'call-1', sequence: 0, summary: 'Consultation', start: '2026-10-01T12:00:00Z',
  organizer: { name: 'Staff', email: 'staff@example.test' }, attendee: { name: 'Client', email: 'client@example.test' },
} };
const row = { id: 'email-1', to: 'staff@example.test', templateKey: 'call-scheduled-dietitian', params, attempts: 0, maxAttempts: 3 };

test('calendar attachments and new provider invitations omit hidden client emails while retaining working appointment data', () => {
  const filtered = privateCalendarParams(params, staff());
  assert.equal(filtered.ics.attendee, undefined);
  assert.equal(params.ics.attendee.email, 'client@example.test');
  const attachment = buildIcsAttachment(row.templateKey, filtered);
  assert.match(attachment.content, /BEGIN:VCALENDAR/);
  assert.match(attachment.content, /ORGANIZER/);
  assert.doesNotMatch(attachment.content, /ATTENDEE|client@example\.test/);
  assert.deepEqual(calendarAttendeeEmails(staff(), params.ics.attendee), []);
  assert.deepEqual(calendarAttendeeEmails(staff({ 'contact.view_email': true }), params.ics.attendee), ['client@example.test']);
  assert.deepEqual(calendarAttendeeEmails(staff({ 'contact.view_email': true }), params.ics.attendee, false), []);
});

test('staff queued notifications recheck current permissions at delivery and leave client messages untouched', async () => {
  for (const templateKey of ['call-scheduled-dietitian', 'call-reminder-dietitian', 'consultation-schedule-generated-dietitian', 'meal-swap-requested']) {
    let hydrated = false;
    const deps = { findUserById: async () => staff(), hydrateUserPermissions: async (user) => {
      hydrated = true;
      return { ...user, permissions: { ...user.permissions, 'calls.view': false, 'diet_plans.view': false } };
    } };
    await assert.rejects(preparePermissionDelivery({ ...row, templateKey }, deps), /not permitted/);
    assert.equal(hydrated, true);
  }
  const ready = await preparePermissionDelivery(row, { findUserById: async () => staff(), hydrateUserPermissions: async (user) => user });
  assert.equal(ready.ics.attendee, undefined);
  assert.equal(await preparePermissionDelivery({ ...row, templateKey: 'call-scheduled' }, {
    findUserById: () => assert.fail('client messages do not use staff checks'),
  }), params);
});

test('email worker uses permission-filtered attachment params, not the retained queue row', async () => {
  let sent;
  await processOne(row, {
    preparePermissionDelivery: async (entry) => privateCalendarParams(entry.params, staff()),
    sendViaTransport: async (message) => { sent = message; return { providerMessageId: 'mock' }; },
    markEmailSent: async () => {},
    markEmailRetryOrFailed: async () => assert.fail('must not retry valid redacted event'),
  });
  assert.ok(sent);
  assert.doesNotMatch(JSON.stringify(sent), /client@example\.test/);
  assert.equal(row.params.ics.attendee.email, 'client@example.test');
});

test('revoked staff permission fails closed before sending a queued notification', async (t) => {
  t.mock.method(console, 'error', () => {});
  let failed;
  await processOne(row, {
    preparePermissionDelivery: async () => { throw new Error('permission denied'); },
    sendViaTransport: async () => assert.fail('must not send'), markEmailSent: async () => assert.fail('must not mark sent'),
    markEmailRetryOrFailed: async (id, failure) => { failed = { id, ...failure }; },
  });
  assert.equal(failed.id, row.id);
  assert.equal(failed.attempts, 1);
  assert.equal(failed.error, 'Email delivery failed');
});

test('trusted producer identity replaces template-supplied values and is persisted for every staff template', async (t) => {
  const inserts = [];
  t.mock.method(pool, 'query', async (sql, values) => {
    if (sql.includes('INSERT INTO email_log')) { inserts.push(values); return [{}]; }
    if (sql.startsWith('SELECT * FROM email_log')) return [[{ id: values[0], params: {} }]];
    assert.fail('Unexpected database query');
  });
  for (const templateKey of ['call-scheduled-dietitian', 'call-rescheduled-dietitian', 'call-cancelled-dietitian',
    'call-reminder-dietitian', 'consultation-schedule-generated-dietitian', 'meal-swap-requested']) {
    const original = { ...SAMPLE_DATA[templateKey], recipientUserId: 'spoofed-user', recipientCompanyId: 'spoofed-company' };
    await sendEmail(staff().email, templateKey, original, { staffRecipient: staff() });
    const queued = JSON.parse(inserts.at(-1)[5]);
    assert.equal(queued.recipientUserId, staff().id);
    assert.equal(queued.recipientCompanyId, staff().companyId);
    assert.equal(original.recipientUserId, 'spoofed-user', 'binding must not mutate producer data');
  }
  assert.equal(inserts.length, 6);
  await assert.rejects(sendEmail(staff().email, row.templateKey, params), /requires a matching account/);
  assert.equal(inserts.length, 6, 'unattributable staff jobs are rejected before enqueue');
});

test('binding staff jobs rejects client, incomplete, and mismatched-address identities', () => {
  for (const recipient of [undefined, { ...staff(), role: 'client' }, { ...staff(), companyId: null }, { ...staff(), id: '' }, { ...staff(), email: 'other@example.test' }]) {
    assert.throws(() => bindStaffRecipientIdentity(row.to, row.templateKey, params, recipient), /matching account/);
  }
});

test('delivery stays bound to the original account and refuses changed company/email/role or deletion', async () => {
  for (const recipient of [null, { ...staff(), id: 'different-user' }, { ...staff(), companyId: 'different-company' },
    { ...staff(), email: 'new-address@example.test' }, { ...staff(), role: 'client' }, { ...staff(), accountStatus: 'suspended' }]) {
    await assert.rejects(preparePermissionDelivery(row, {
      findUserById: async (id) => { assert.equal(id, 'staff-1'); return recipient; },
      hydrateUserPermissions: async (user) => user,
      findUserByEmail: () => assert.fail('must never discover replacement owners by the old email'),
    }), /not permitted/);
  }
});

test('legacy staff queue rows without stable identity fail closed without looking up an address owner', async () => {
  for (const incomplete of [{}, { recipientUserId: 'staff-1' }, { recipientCompanyId: 'company-1' }]) {
    await assert.rejects(preparePermissionDelivery({ ...row, params: incomplete }, {
      findUserById: () => assert.fail('must not guess legacy identity'),
      findUserByEmail: () => assert.fail('must not look up a newly claimed address'),
    }), /missing its account and company reference/);
  }
});
