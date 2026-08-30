import { randomUUID } from 'node:crypto';
import { renderTemplate } from './renderTemplate.js';
import { buildIcsAttachment } from './ics.js';
import { enqueueEmail } from '../models/EmailLog.js';
import { env } from '../config/env.js';

// The single entry point for sending any email in the app. Renders (and validates) the template
// up front so a bad templateKey or a missing param fails immediately in the caller's request path
// — but the actual network send never happens here. This only writes a queued row; the worker
// (worker.js) does the sending, so a slow or failing mail provider can never block or break a
// booking/enquiry/etc. request.
//
// idempotencyKey: pass one derived from the triggering event (e.g. `call-scheduled:${callId}`) so
// a retried job or a handler that fires twice lands on the same email_log row instead of sending
// twice. Omit it only for a one-off send with no natural event identity (e.g. the manual test
// tool) — a random key is generated so every call still gets a row.
export async function sendEmail(to, templateKey, params, { idempotencyKey, relatedEntity } = {}) {
  // Only `subject` is kept — rendering here is purely to validate the template/params fail-fast in
  // the caller's request path; the worker re-renders html/text from templateKey+params right
  // before actually sending (see email_log's `params` column comment in schema.sql).
  const { subject } = renderTemplate(templateKey, params);
  // Same fail-fast reasoning for a calendar invite (params.ics) — a malformed one should surface
  // immediately in the caller's request path, not after the worker's first retry.
  buildIcsAttachment(templateKey, params);

  const log = await enqueueEmail({
    idempotencyKey: idempotencyKey ?? randomUUID(),
    to,
    templateKey,
    subject,
    params,
    relatedEntity,
    maxAttempts: env.emailMaxAttempts,
  });

  return log;
}
