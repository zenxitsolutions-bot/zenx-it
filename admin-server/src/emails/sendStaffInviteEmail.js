import { sendEmail } from './sendEmail.js';
import { env } from '../config/env.js';
import { renderEmailLayout } from './layout.js';

export async function sendStaffInviteEmail({ to, name, token }) {
  const url = `${env.clientOrigins[0]}/admin/set-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    subject: "You've been invited to ZenX Admin",
    text: `Hi ${name},\n\nSet your password to finish joining ZenX Admin: ${url}`,
    html: renderEmailLayout({ heading: 'Welcome to ZenX Admin', paragraphs: [`Hi ${name},`, 'Set your password to finish joining ZenX Admin.'], ctaLabel: 'Set your password', ctaUrl: url }),
  });
}
