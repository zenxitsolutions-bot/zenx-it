import { sendEmail } from './sendEmail.js';
import { env } from '../config/env.js';

export async function sendStaffInviteEmail({ to, name, token }) {
  const url = `${env.clientOrigins[0]}/admin/set-password?token=${token}`;
  await sendEmail({
    to,
    subject: "You've been invited to ZenX Admin",
    text: `Hi ${name},\n\nSet your password to finish joining ZenX Admin: ${url}`,
    html: `<p>Hi ${name},</p><p><a href="${url}">Set your password</a> to finish joining ZenX Admin.</p>`,
  });
}
