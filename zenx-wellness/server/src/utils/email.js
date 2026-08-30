import { Resend } from 'resend';
import { env } from '../config/env.js';

// Constructed lazily, not at module load: importing this file must never crash the server when
// RESEND_API_KEY isn't set (e.g. local dev before Resend is configured) — only actually sending
// an email should fail, and forgotPassword's controller already catches and logs that.
let client;
function getClient() {
  if (!env.resendApiKey) throw new Error('RESEND_API_KEY is not configured');
  client ??= new Resend(env.resendApiKey);
  return client;
}

export async function sendPasswordResetEmail(to, resetUrl) {
  await getClient().emails.send({
    from: env.emailFrom,
    to,
    subject: 'Reset your Nourishly password',
    html: `
      <p>We received a request to reset your Nourishly password.</p>
      <p><a href="${resetUrl}">Choose a new password</a></p>
      <p>This link expires in ${env.passwordResetTokenTtlMinutes} minutes. If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
