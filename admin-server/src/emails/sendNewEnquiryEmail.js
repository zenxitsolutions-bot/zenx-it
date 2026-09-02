import { sendEmail } from './sendEmail.js';
import { env } from '../config/env.js';

// Staff notification for a public contact-form submission. Failures are logged by the caller —
// this must never turn a successful insert into a 500.
export async function sendNewEnquiryEmail(enquiry) {
  const to = env.enquiryNotifyEmail;
  if (!to) {
    console.warn('[sendNewEnquiryEmail] ENQUIRY_NOTIFY_EMAIL is not set — skipping staff email');
    return;
  }

  const lines = [
    `Company: ${enquiry.company_name}`,
    `Contact: ${enquiry.contact_name}`,
    `Email: ${enquiry.email}`,
    enquiry.phone ? `Phone: ${enquiry.phone}` : null,
    enquiry.website ? `Website: ${enquiry.website}` : null,
    `Service: ${enquiry.service}`,
    `Source: ${enquiry.source}`,
    enquiry.notes ? `Message:\n${enquiry.notes}` : null,
  ].filter(Boolean);

  await sendEmail({
    to,
    subject: `New enquiry from ${enquiry.company_name}`,
    text: lines.join('\n'),
    html: `<p>A new enquiry was submitted on the ZenX website.</p><pre>${lines
      .map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;'))
      .join('\n')}</pre>`,
  });
}
