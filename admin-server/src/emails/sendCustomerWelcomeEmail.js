import { sendEmail } from './sendEmail.js';
import { env } from '../config/env.js';

export async function sendCustomerWelcomeEmail({ to, name, companyName }) {
  // Customer login lives in the admin SPA (clientOrigins[0]) at /login, not on the marketing site.
  const url = `${env.clientOrigins[0]}/login`;
  await sendEmail({
    to,
    subject: `Welcome to ${companyName}'s ZenX account`,
    text: `Hi ${name},\n\nYour account is ready. Sign in at ${url} with the password you were given — you'll be asked to set a new one on first login.`,
    html: `<p>Hi ${name},</p><p>Your account is ready. <a href="${url}">Sign in</a> with the password you were given — you'll be asked to set a new one on first login.</p>`,
  });
}
