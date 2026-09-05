import { sendEmail } from '../emails/sendEmail.js';

// Called once, right after a new enquiry is created (server/src/controllers/enquiry.controller.js
// — the only entry point that creates one). Wrapped in try/catch: a lead's acknowledgment email
// failing to queue must never fail the enquiry submission itself.
export async function notifyEnquirySubmitted(enquiry) {
  try {
    await sendEmail(
      enquiry.email,
      'enquiry-acknowledgment',
      { lead_name: enquiry.name, goal: enquiry.goal },
      { idempotencyKey: `enquiry-acknowledgment:${enquiry.id}`, relatedEntity: { type: 'enquiry', id: enquiry.id } }
    );
  } catch (err) {
    console.error(`[notifications] failed to queue enquiry acknowledgment for ${enquiry.id}:`, err);
  }
}
