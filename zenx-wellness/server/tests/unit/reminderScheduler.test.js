import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReminderDue } from '../../src/services/reminderScheduler.js';

const NOW = new Date('2026-09-15T12:00:00Z');

test('not yet due: the reminder window has not opened', () => {
  const scheduledAt = new Date('2026-09-15T13:00:00Z'); // 1 hour out
  assert.equal(
    isReminderDue({ now: NOW, scheduledAt, reminderMinutesBefore: 30, reminderSentAt: null }),
    false
  );
});

test('due: now is inside the reminder window and the call has not started', () => {
  const scheduledAt = new Date('2026-09-15T12:20:00Z'); // 20 minutes out, 30-minute reminder
  assert.equal(
    isReminderDue({ now: NOW, scheduledAt, reminderMinutesBefore: 30, reminderSentAt: null }),
    true
  );
});

test('due at the exact window-open boundary', () => {
  const scheduledAt = new Date('2026-09-15T12:30:00Z'); // exactly 30 minutes out
  assert.equal(
    isReminderDue({ now: NOW, scheduledAt, reminderMinutesBefore: 30, reminderSentAt: null }),
    true
  );
});

test('no longer due once the call has started (safety margin against a slow tick)', () => {
  const scheduledAt = new Date('2026-09-15T11:59:00Z'); // already started a minute ago
  assert.equal(
    isReminderDue({ now: NOW, scheduledAt, reminderMinutesBefore: 30, reminderSentAt: null }),
    false
  );
});

test('dedupe: already-sent reminders are never due again, even inside the window', () => {
  const scheduledAt = new Date('2026-09-15T12:20:00Z');
  assert.equal(
    isReminderDue({ now: NOW, scheduledAt, reminderMinutesBefore: 30, reminderSentAt: new Date('2026-09-15T11:50:00Z') }),
    false
  );
});

test('no reminder configured: reminderMinutesBefore null is never due', () => {
  const scheduledAt = new Date('2026-09-15T12:10:00Z');
  assert.equal(
    isReminderDue({ now: NOW, scheduledAt, reminderMinutesBefore: null, reminderSentAt: null }),
    false
  );
});
