import {
  listFollowupsPendingReminder,
  listOverdueFollowups,
  markFollowupReminderSent,
  markFollowupOverdue,
} from '../models/Followup.js';
import { findEnquiryById } from '../models/Enquiry.js';
import { findProfileById } from '../models/Profile.js';
import { createNotification } from '../models/Notification.js';
import { sendFollowupReminderEmail } from '../emails/sendFollowupReminderEmail.js';
import { formatInZone, effectiveTimezone } from './timezoneService.js';
import { env } from '../config/env.js';

// "15 minutes before" etc. -> minutes. Kept local (not in timezoneService.js) — this is a
// followups-specific display-label mapping, not a general timezone primitive.
const REMINDER_MINUTES = {
  '15 minutes before': 15,
  '30 minutes before': 30,
  '1 hour before': 60,
  '1 day before': 24 * 60,
};

// Pure predicate, unit-testable without a DB (tests/unit/reminderScheduler.test.js) — same shape as
// wellness-app's own reminderScheduler.js#isReminderDue.
export function isReminderDue({ now, scheduledAtUtc, reminder, reminderSentAt }) {
  const minutes = REMINDER_MINUTES[reminder];
  if (!minutes || reminderSentAt) return false;
  const nowMs = now.getTime();
  const scheduledMs = scheduledAtUtc.getTime();
  const windowOpensMs = scheduledMs - minutes * 60_000;
  return nowMs >= windowOpensMs && nowMs < scheduledMs;
}

async function sendReminder(followup, now) {
  await markFollowupReminderSent(followup.id);
  const [enquiry, assignee] = await Promise.all([
    findEnquiryById(followup.enquiry_id),
    followup.assigned_to ? findProfileById(followup.assigned_to) : null,
  ]);
  if (!enquiry || !assignee) return; // deleted/unassigned between the due-query and now
  const timezone = effectiveTimezone(assignee);
  await sendFollowupReminderEmail({
    to: assignee.email,
    staffName: assignee.first_name,
    companyName: enquiry.company_name,
    meetingTime: `${formatInZone(followup.scheduled_at_utc, timezone)} (${timezone})`,
  });
}

async function sendOverdueNotice(followup) {
  await markFollowupOverdue(followup.id);
  const [enquiry, assignee] = await Promise.all([
    findEnquiryById(followup.enquiry_id),
    followup.assigned_to ? findProfileById(followup.assigned_to) : null,
  ]);
  if (!enquiry) return;
  await createNotification({
    kind: 'FOLLOWUP_OVERDUE',
    title: 'Follow-up overdue',
    body: `The follow-up with ${enquiry.company_name} is overdue.`,
    entityId: followup.id,
  });
  if (assignee) {
    const timezone = effectiveTimezone(assignee);
    await sendFollowupReminderEmail({
      to: assignee.email,
      staffName: assignee.first_name,
      companyName: enquiry.company_name,
      meetingTime: `${formatInZone(followup.scheduled_at_utc, timezone)} (${timezone})`,
      overdue: true,
    }).catch((err) => console.error(`[reminder:scheduler] overdue email failed for followup ${followup.id}:`, err));
  }
}

// One poll tick: fire "N minutes before" reminders whose window has opened, then sweep for
// still-scheduled follow-ups whose time has already passed (marking them OVERDUE and — finally —
// emitting the FOLLOWUP_OVERDUE notification kind that existed in the schema but was never used).
export async function runReminderTick(now = new Date()) {
  let sent = 0;

  const pending = await listFollowupsPendingReminder();
  for (const followup of pending) {
    if (!isReminderDue({ now, scheduledAtUtc: followup.scheduled_at_utc, reminder: followup.reminder, reminderSentAt: followup.reminder_sent_at })) continue;
    try {
      await sendReminder(followup, now);
      sent += 1;
    } catch (err) {
      console.error(`[reminder:scheduler] failed to send reminder for followup ${followup.id}:`, err);
    }
  }

  const overdue = await listOverdueFollowups();
  for (const followup of overdue) {
    try {
      await sendOverdueNotice(followup);
    } catch (err) {
      console.error(`[reminder:scheduler] failed to mark followup ${followup.id} overdue:`, err);
    }
  }

  return sent;
}

export function startReminderScheduler() {
  const tick = () => {
    runReminderTick().catch((err) => console.error('[reminder:scheduler] tick failed:', err));
  };
  const handle = setInterval(tick, env.reminderSchedulerIntervalMs);
  handle.unref?.();
  console.log(`[reminder:scheduler] polling every ${env.reminderSchedulerIntervalMs}ms`);
  return handle;
}
