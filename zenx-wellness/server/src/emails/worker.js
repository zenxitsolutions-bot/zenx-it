import { claimBatch, reclaimStuckSendingRows, markEmailSent, markEmailRetryOrFailed } from '../models/EmailLog.js';
import { renderTemplate } from './renderTemplate.js';
import { buildIcsAttachment } from './ics.js';
import { buildPdfAttachment } from './pdf.js';
import { sendViaTransport } from './transport/index.js';
import { nextAttemptDelayMs } from './backoff.js';
import { env } from '../config/env.js';
import { prepareWelcomeDelivery } from './welcomeDelivery.js';
import { assertSafeQueueParams, safeEmailFailure } from './security.js';
import { preparePermissionDelivery } from './permissionDelivery.js';

export async function processOne(row, dependencies = {}) {
  const prepareWelcome = dependencies.prepareWelcomeDelivery ?? prepareWelcomeDelivery;
  const preparePermissions = dependencies.preparePermissionDelivery ?? preparePermissionDelivery;
  const deliver = dependencies.sendViaTransport ?? sendViaTransport;
  const markSent = dependencies.markEmailSent ?? markEmailSent;
  const markFailed = dependencies.markEmailRetryOrFailed ?? markEmailRetryOrFailed;
  try {
    // Old welcome rows are upgraded by prepareWelcomeDelivery (ignoring their
    // temp password). Other legacy credential-bearing jobs fail closed: retries
    // must not deliver an old reset token retained in the queue.
    if (row.templateKey !== 'client-welcome') assertSafeQueueParams(row.params);
    const params = row.templateKey === 'client-welcome' ? await prepareWelcome(row) : await preparePermissions(row);
    const { subject, html, text } = renderTemplate(row.templateKey, params);
    const attachments = [
      buildIcsAttachment(row.templateKey, params),
      await buildPdfAttachment(row.templateKey, params),
    ].filter(Boolean);
    const { providerMessageId } = await deliver({ to: row.to, subject, html, text, attachments, sensitive: row.templateKey === 'client-welcome' || row.templateKey === 'password-reset' });
    await markSent(row.id, providerMessageId);
  } catch (err) {
    const attempts = row.attempts + 1;
    const nextAttemptAt = new Date(Date.now() + nextAttemptDelayMs(attempts));
    await markFailed(row.id, {
      error: safeEmailFailure(),
      nextAttemptAt,
      attempts,
      maxAttempts: row.maxAttempts,
    });
    console.error(`[email:worker] send failed for ${row.id}, attempt ${attempts}/${row.maxAttempts}`);
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
    console.error('[email:worker] tick failed');
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
