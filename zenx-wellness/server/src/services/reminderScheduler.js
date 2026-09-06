import { listCallsDueForReminder, markCallReminderSent, findCallById } from '../models/Call.js';
import { notifyCallEvent } from './callNotifications.js';
import { env } from '../config/env.js';

// Pure predicate, extracted so it's unit-testable without a DB (tests/unit/reminderScheduler.test.js)
// — mirrors the exact WHERE clause in models/Call.js#listCallsDueForReminder. `now`/`scheduledAt`
// are Date instances; `reminderMinutesBefore` may be null (no reminder configured);
// `reminderSentAt` non-null means already dispatched.
export function isReminderDue({ now, scheduledAt, reminderMinutesBefore, reminderSentAt }) {
  if (reminderMinutesBefore == null || reminderSentAt) return false;
  const nowMs = now.getTime();
  const scheduledMs = scheduledAt.getTime();
  const windowOpensMs = scheduledMs - reminderMinutesBefore * 60_000;
  return nowMs >= windowOpensMs && nowMs < scheduledMs;
}

// One poll tick: find every scheduled call whose reminder window has opened and hasn't fired yet,
// mark it sent (before actually sending — a duplicate-send-on-crash is a much smaller problem than
// a duplicate-send-on-every-retry-forever), then enqueue its two reminder emails via the existing
// callNotifications.js machinery (each recipient's own timezone, same as every other call event).
export async function runReminderTick(now = new Date()) {
  const dueIds = await listCallsDueForReminder(now);
  let sent = 0;
  for (const id of dueIds) {
    try {
      await markCallReminderSent(id);
      const call = await findCallById(id);
      if (!call) continue; // deleted between the due-query and now — nothing to remind about
      await notifyCallEvent('reminder', call);
      sent += 1;
    } catch (err) {
      // One call's failure must never block the rest of the batch — reminder_sent_at is already
      // set, so this call won't be retried; that's an accepted tradeoff (a missed reminder is far
      // less harmful than a reminder storm from an endlessly-retried poison row).
      console.error(`[reminder:scheduler] failed to send reminder for call ${id}:`, err);
    }
  }
  return sent;
}

// Starts the in-process poller. Call once from server.js after connectDb() — same convention as
// emails/worker.js's startEmailWorker, never imported from app.js so tests importing the Express
// app never spin up a background timer.
export function startReminderScheduler() {
  const tick = () => {
    runReminderTick().catch((err) => console.error('[reminder:scheduler] tick failed:', err));
  };
  const handle = setInterval(tick, env.reminderSchedulerIntervalMs);
  handle.unref?.();
  console.log(`[reminder:scheduler] polling every ${env.reminderSchedulerIntervalMs}ms`);
  return handle;
}
