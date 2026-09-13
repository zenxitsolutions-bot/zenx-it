import { env } from '../config/env.js';
import { renderTemplate } from '../emails/renderTemplate.js';
import { sendViaTransport } from '../emails/transport/index.js';

// Sent through the shared transport (emails/transport/index.js) rather than the Resend SDK
// directly, so this obeys EMAIL_TRANSPORT like every other email: the console/file transport in
// dev/test, SMTP or Resend in production. Sending straight to Resend meant a dev reset always went
// to the live provider, where an unverified account rejects any recipient but the account owner's
// own address — and since forgotPassword's controller catches and logs send failures, the caller
// still saw the normal success response while nothing was delivered.
//
// Body now comes from emails/templates/password-reset/ like every other email in the app, instead
// of an inline string. That buys the house layout (cream card, Playfair heading, coral button),
// renderTemplate's HTML escaping of every interpolated value, and its missing-param check — a
// typo'd key throws here rather than shipping a literal "{{reset_url}}" to a user.
//
// Still a direct send, not an email_log/worker enqueue: a password reset is worthless if it
// arrives on a later poll tick, and the caller already treats a send failure as non-fatal.
export async function sendPasswordResetEmail(to, resetUrl, clientName = 'there', companyName = 'ZenX Dietitian') {
  const minutes = env.passwordResetTokenTtlMinutes;
  // "1 hour" reads better than "60 minutes" for the common case; anything not a whole number of
  // hours stays in minutes rather than rounding the user's window up or down.
  const expiryLabel =
    minutes % 60 === 0 ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}` : `${minutes} minutes`;

  const { subject, html, text } = renderTemplate('password-reset', {
    client_name: clientName,
    company_name: companyName,
    reset_url: resetUrl,
    expiry_label: expiryLabel,
  });

  await sendViaTransport({ to, subject, html, text });
}
