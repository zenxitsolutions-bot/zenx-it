import { claimBatch, reclaimStuckSendingRows, markEmailSent, markEmailRetryOrFailed } from '../models/EmailLog.js';
import { renderTemplate } from './renderTemplate.js';
import { buildIcsAttachment } from './ics.js';
import { sendViaTransport } from './transport/index.js';
import { nextAttemptDelayMs } from './backoff.js';
import { env } from '../config/env.js';

async function processOne(row) {
  try {
    const { subject, html, text } = renderTemplate(row.templateKey, row.params);
    const attachment = buildIcsAttachment(row.templateKey, row.params);
    const { providerMessageId } = await sendViaTransport({ to: row.to, subject, html, text, attachment });
    await markEmailSent(row.id, providerMessageId);
  } catch (err) {
    const attempts = row.attempts + 1;
    const nextAttemptAt = new Date(Date.now() + nextAttemptDelayMs(attempts));
    await markEmailRetryOrFailed(row.id, {
      error: err.message || String(err),
      nextAttemptAt,
      attempts,
      maxAttempts: row.maxAttempts,
    });
    console.error(`[email:worker] send failed for ${row.id} (${row.templateKey} → ${row.to}), attempt ${attempts}/${row.maxAttempts}:`, err.message);
  }
}

// One claim-and-send cycle. Exported (not just used by the interval below) so a one-off script —
// src/scripts/sendTestEmail.js — can enqueue a row and immediately drain it without needing a
// separately running server process with its own worker interval.
export async function drainOnce() {
  try {
    await reclaimStuckSendingRows();
    const batch = await claimBatch(env.emailQueueBatchSize);
    for (const row of batch) await processOne(row);
    return batch.length;
  } catch (err) {
    // A tick-level failure (e.g. a transient DB blip) must not kill the interval — the next tick
    // just tries again.
    console.error('[email:worker] tick failed:', err);
    return 0;
  }
}

// Starts the in-process queue poller. Call once from server.js after connectDb() — never from
// app.js, so importing the Express app in tests never spins up a background timer.
export function startEmailWorker() {
  const handle = setInterval(drainOnce, env.emailQueuePollIntervalMs);
  handle.unref?.(); // never keep the process alive on its own (e.g. during tests/scripts)
  console.log(`[email:worker] polling every ${env.emailQueuePollIntervalMs}ms`);
  return handle;
}
