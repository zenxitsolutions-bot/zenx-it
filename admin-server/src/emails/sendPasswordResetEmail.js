import { sendEmail } from './sendEmail.js';
import { renderEmailLayout } from './layout.js';
import { env } from '../config/env.js';

// Rendered from the caller's minutes rather than a fixed string, so the sentence in the email can
// never drift from the TTL the token was actually minted with (auth.controller.js's
// RESET_TTL_MINUTES). Days/hours read better than a raw minute count if that value ever grows —
// the sibling staff-invite link, sent by sendStaffInviteEmail.js, already runs to 7 days.
function formatExpiry(minutes) {
  if (minutes % (60 * 24) === 0) {
    const days = minutes / (60 * 24);
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${minutes} minutes`;
}

export async function sendPasswordResetEmail({ to, name, token, kind, expiresInMinutes = 60 }) {
  // Both staff (/admin/reset-password) and customer (/reset-password) routes are served by the
  // same admin frontend SPA (clientOrigins[0]) — the marketing site (clientOrigins[1]) only ever
  // hosts the public contact form, never a login/reset page.
  const path = kind === 'staff' ? '/admin/reset-password' : '/reset-password';
  const url = `${env.clientOrigins[0]}${path}?token=${token}`;
  const expiry = formatExpiry(expiresInMinutes);

  const paragraphs = [
    `Hi ${name},`,
    'We received a request to reset the password on your ZenX account. Choose a new one using the button below.',
    `This link expires in ${expiry} and can only be used once.`,
  ];

  await sendEmail({
    to,
    subject: 'Reset your ZenX password',
    html: renderEmailLayout({
      heading: 'Reset your password',
      paragraphs,
      ctaLabel: 'Choose a new password',
      ctaUrl: url,
      // Named rather than implied: a reset email nobody requested is the one signal a user has
      // that someone else is trying to get into their account.
      footer: "If you didn't request this, you can safely ignore this email — your password will not change.",
    }),
    text: [
      `Hi ${name},`,
      '',
      'We received a request to reset the password on your ZenX account.',
      'Choose a new one here:',
      url,
      '',
      `This link expires in ${expiry} and can only be used once.`,
      '',
      "If you didn't request this, you can safely ignore this email — your password will not change.",
      '',
      'ZenX IT Solutions',
    ].join('\n'),
  });
}
