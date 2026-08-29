import { sendEmail } from './sendEmail.js';
import { env } from '../config/env.js';

export async function sendPasswordResetEmail({ to, name, token, kind }) {
  // Both staff (/admin/reset-password) and customer (/reset-password) routes are served by the
  // same admin frontend SPA (clientOrigins[0]) — the marketing site (clientOrigins[1]) only ever
  // hosts the public contact form, never a login/reset page.
  const path = kind === 'staff' ? '/admin/reset-password' : '/reset-password';
  const url = `${env.clientOrigins[0]}${path}?token=${token}`;
  await sendEmail({
    to,
    subject: 'Reset your password',
    text: `Hi ${name},\n\nReset your password: ${url}\n\nIf you didn't request this, ignore this email.`,
    html: `<p>Hi ${name},</p><p><a href="${url}">Reset your password</a></p><p>If you didn't request this, ignore this email.</p>`,
  });
}
