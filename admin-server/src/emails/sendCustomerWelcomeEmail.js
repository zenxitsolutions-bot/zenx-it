import { sendEmail } from './sendEmail.js';
import { renderEmailLayout } from './layout.js';
import { resolveCompanyLoginUrl } from '../services/companyLoginUrl.js';

export async function sendCustomerWelcomeEmail({ to, name, companyName, companySlug, applicationSlugs = [] }) {
  const url = await resolveCompanyLoginUrl({ companySlug, applicationSlugs });
  if (!url) {
    const error = new Error('Configure the customer application URL before sending a welcome email');
    error.code = 'ERR_CUSTOMER_LOGIN_URL';
    throw error;
  }
  await sendEmail({
    to,
    subject: `Welcome to ${companyName}'s ZenX account`,
    text: `Hi ${name},\n\nYour account is ready. Sign in at ${url} with the password you were given — you'll be asked to set a new one on first login.`,
    html: renderEmailLayout({ heading: `Welcome to ${companyName}`, paragraphs: [`Hi ${name},`, "Your account is ready. Sign in with the password you were given — you'll be asked to set a new one on first login."], ctaLabel: 'Sign in', ctaUrl: url }),
  });
}
