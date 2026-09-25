import test from 'node:test';
import assert from 'node:assert/strict';
import { redactContactDetails } from '../../src/utils/contactPrivacy.js';
import { contactPrivacy } from '../../src/middleware/contactPrivacy.js';
import { canViewNotification } from '../../src/utils/notificationPermissions.js';

const staff = (overrides = {}, extra = {}) => ({
  id: 'staff-1', role: 'dietitian', permissions: { 'contact.view_email': false, 'contact.view_phone': false, ...overrides }, ...extra,
});
const person = { _id: 'client-1', role: 'client', name: 'Client', email: 'client@example.test', phone: '+15551234567' };

test('contact restrictions remove nested users, call leads, insight rows and notification metadata without mutating source', () => {
  const payload = { users: [person], call: { client: person, enquiry: { _id: 'lead-1', email: 'lead@example.test', phone: '555555' } },
    insights: { recentEnquiries: [{ ...person, client_email: 'other@example.test', client_phone: '999999' }] },
    notification: { metadata: { contact: person } } };
  const result = redactContactDetails(payload, staff());
  assert.doesNotMatch(JSON.stringify(result), /example\.test|15551234567|555555|999999/);
  assert.equal(result.users[0].name, 'Client');
  assert.equal(payload.users[0].email, 'client@example.test');
  assert.notEqual(result.users[0], payload.users[0]);
});

test('email and phone controls are independent', () => {
  assert.deepEqual(redactContactDetails(person, staff({ 'contact.view_phone': true })),
    { _id: 'client-1', role: 'client', name: 'Client', phone: '+15551234567' });
  assert.deepEqual(redactContactDetails(person, staff({ 'contact.view_email': true })),
    { _id: 'client-1', role: 'client', name: 'Client', email: 'client@example.test' });
});

test('own profile keeps its contact details but never confers that exemption on nested people or coincident metadata ids', () => {
  const own = { _id: 'staff-1', role: 'dietitian', email: 'self@example.test', phone: '12345', assignedClient: person,
    clientEmail: 'hidden@example.test', clientPhone: 'hidden-phone' };
  const result = redactContactDetails({ user: own, emailLog: { id: 'staff-1', email: 'hidden@example.test' } }, staff());
  assert.equal(result.user.email, own.email);
  assert.equal(result.user.phone, own.phone);
  assert.equal(result.user.assignedClient.email, undefined);
  assert.equal(result.user.clientEmail, undefined);
  assert.equal(result.user.clientPhone, undefined);
  assert.equal(result.emailLog.email, undefined);
});

test('recipient.to and email-log envelopes cannot bypass redaction; dates, permission names and prose stay intact', () => {
  const value = { emailLog: { to: 'hidden@example.test', templateKey: 'call-scheduled', status: 'sent' },
    notification: { recipient: { to: ['hidden@example.test'], name: 'Client' } },
    range: { from: '2026-01-01', to: '2026-01-08' },
    note: 'User wrote contact@example.test in a note', body: 'Call 555-0100',
    permissions: { 'contact.view_email': false }, emailEnabled: true, phoneCount: 4 };
  const result = redactContactDetails(value, staff());
  assert.equal(result.emailLog.to, undefined);
  assert.equal(result.notification.recipient.to, undefined);
  assert.deepEqual(result.range, value.range);
  assert.equal(result.note, value.note);
  assert.equal(result.body, value.body);
  assert.deepEqual(result.permissions, value.permissions);
  assert.equal(result.emailEnabled, true);
  assert.equal(result.phoneCount, 4);
});

test('public responses, clients and staff with existing defaults retain prior contact behavior', () => {
  assert.equal(redactContactDetails(person, undefined), person);
  assert.equal(redactContactDetails(person, { id: 'client-2', role: 'client' }), person);
  assert.equal(redactContactDetails(person, { id: 'staff-1', role: 'dietitian' }), person);
  assert.equal(redactContactDetails(person, { id: 'admin-1', role: 'admin' }), person);
  assert.equal(redactContactDetails(person, staff({}, { role: 'admin', isMainAdmin: true })), person);
});

test('response middleware evaluates authentication at send time and disables private response caching', () => {
  const req = {};
  const headers = {};
  const res = { setHeader: (name, value) => { headers[name] = value; }, json(body) { assert.equal(this, res); return body; } };
  let nextCalled = false;
  contactPrivacy(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  req.user = staff();
  const result = res.json(person);
  assert.equal(result.email, undefined);
  assert.equal(result.phone, undefined);
  assert.equal(headers['Cache-Control'], 'private, no-store');
});

test('notifications cannot expose disabled module data through old rows or absolute/tenant links', () => {
  const viewer = staff({ 'diet_plans.view': false, 'calls.view': false, 'messages.use': false, 'enquiries.view': false, 'reports.view': false });
  for (const notification of [
    { type: 'meal-swap-requested', url: '/app/clients/client-1' },
    { url: 'https://example.test/company/app/calls?future=1' },
    { url: '/company/app/messages' }, { url: '/app/enquiries/lead-1' }, { url: '/app/reports' },
  ]) assert.equal(canViewNotification(viewer, notification), false, JSON.stringify(notification));
  assert.equal(canViewNotification(viewer, { type: 'info', url: '/app/settings?next=/app/calls' }), true);
  assert.equal(canViewNotification({ role: 'client' }, { type: 'meal-swap', url: '/app/meals' }), true);
});
