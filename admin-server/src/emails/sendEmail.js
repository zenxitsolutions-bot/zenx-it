import { Resend } from 'resend';
import { env } from '../config/env.js';

// Simple direct send, not a queued worker — this backend's email volume (staff invites, password
// resets, customer welcomes) doesn't need wellness-app's retry/backoff queue. Falls back to
// logging to console when RESEND_API_KEY is unset (local dev), same intent as wellness-app's
// console transport, just without the separate transport-selection abstraction.
let client;
function getClient() {
  if (!env.resendApiKey) throw new Error('RESEND_API_KEY is not configured');
  client ??= new Resend(env.resendApiKey);
  return client;
}

export async function sendEmail({ to, subject, html, text }) {
  if (!env.resendApiKey) {
    console.log(`[email:console] to=${to} subject="${subject}"\n${text || html}`);
    return;
  }
  const { error } = await getClient().emails.send({ from: env.emailFrom, to, subject, html, text });
  if (error) {
    console.error(`[email] Resend send failed to=${to} subject="${subject}":`, error);
    throw new Error(error.message || 'Resend send failed');
  }
}
