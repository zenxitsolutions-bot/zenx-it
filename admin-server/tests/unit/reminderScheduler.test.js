import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReminderDue } from '../../src/services/reminderScheduler.js';

const NOW = new Date('2026-09-15T12:00:00Z');

test('not yet due: reminder window has not opened', () => {
  assert.equal(
    isReminderDue({ now: NOW, scheduledAtUtc: new Date('2026-09-15T13:00:00Z'), reminder: '30 minutes before', reminderSentAt: null }),
    false
  );
});

test('due: now is inside the "30 minutes before" window', () => {
  assert.equal(
    isReminderDue({ now: NOW, scheduledAtUtc: new Date('2026-09-15T12:20:00Z'), reminder: '30 minutes before', reminderSentAt: null }),
    true
  );
});

test('"1 hour before" and "1 day before" map to the correct minute counts', () => {
  assert.equal(
    isReminderDue({ now: NOW, scheduledAtUtc: new Date('2026-09-15T12:30:00Z'), reminder: '1 hour before', reminderSentAt: null }),
    true
  );
  assert.equal(
    isReminderDue({ now: NOW, scheduledAtUtc: new Date('2026-09-16T11:00:00Z'), reminder: '1 day before', reminderSentAt: null }),
    true
  );
  assert.equal(
    isReminderDue({ now: NOW, scheduledAtUtc: new Date('2026-09-20T11:00:00Z'), reminder: '1 day before', reminderSentAt: null }),
    false
  );
});

test('"None" is never due, regardless of timing', () => {
  assert.equal(
    isReminderDue({ now: NOW, scheduledAtUtc: new Date('2026-09-15T12:05:00Z'), reminder: 'None', reminderSentAt: null }),
    false
  );
});

test('dedupe: already-sent reminders are never due again', () => {
  assert.equal(
    isReminderDue({ now: NOW, scheduledAtUtc: new Date('2026-09-15T12:20:00Z'), reminder: '30 minutes before', reminderSentAt: new Date('2026-09-15T11:50:00Z') }),
    false
  );
});

test('no longer due once the scheduled time has passed', () => {
  assert.equal(
    isReminderDue({ now: NOW, scheduledAtUtc: new Date('2026-09-15T11:59:00Z'), reminder: '30 minutes before', reminderSentAt: null }),
    false
  );
});
