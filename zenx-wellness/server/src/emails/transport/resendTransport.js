import { Resend } from 'resend';
import { env } from '../../config/env.js';

// Constructed lazily so importing this module never crashes the server — resolveTransportKind
// (index.js) is what guarantees RESEND_API_KEY is actually present before this transport is ever
// selected in production; this mirrors the existing lazy-client pattern in utils/email.js.
let client;
function getClient() {
  if (!env.resendApiKey) throw new Error('RESEND_API_KEY is not configured');
  client ??= new Resend(env.resendApiKey);
  return client;
}

export async function sendViaResend({ to, subject, html, text, attachment }) {
  const attachments = attachment
    ? [{ filename: attachment.filename, contentType: attachment.contentType, content: Buffer.from(attachment.content, 'utf8').toString('base64') }]
    : undefined;
  const { data, error } = await getClient().emails.send({ from: env.emailFrom, to, subject, html, text, attachments });
  if (error) throw new Error(error.message || 'Resend send failed');
  return { providerMessageId: data?.id ?? null };
}
