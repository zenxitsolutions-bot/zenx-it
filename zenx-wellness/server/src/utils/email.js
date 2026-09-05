import { env } from '../config/env.js';
import { sendViaTransport } from '../emails/transport/index.js';

// Sent through the shared transport (emails/transport/index.js) rather than the Resend SDK
// directly, so this obeys EMAIL_TRANSPORT like every other email: the console/file transport in
// dev/test, Resend in production. Sending straight to Resend meant a dev reset always went to the
// live provider, where an unverified account rejects any recipient but the account owner's own
// address with a 403 — and since forgotPassword's controller catches and logs send failures, the
// caller still saw the normal success response while nothing was delivered.
//
// Still a direct send, not an email_log/worker enqueue: a password reset is worthless if it
// arrives on a later poll tick, and the caller already treats a send failure as non-fatal.
export async function sendPasswordResetEmail(to, resetUrl) {
  const expiry = `This link expires in ${env.passwordResetTokenTtlMinutes} minutes. If you didn't request this, you can safely ignore this email.`;

  await sendViaTransport({
    to,
    subject: 'Reset your Nourishly password',
    html: `
      <p>We received a request to reset your Nourishly password.</p>
      <p><a href="${resetUrl}">Choose a new password</a></p>
      <p>${expiry}</p>
    `,
    text: `We received a request to reset your Nourishly password.\n\nChoose a new password: ${resetUrl}\n\n${expiry}`,
  });
}
