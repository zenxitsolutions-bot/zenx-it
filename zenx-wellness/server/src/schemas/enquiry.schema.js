import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { PLAN_DURATIONS } from '../constants/planDurations.js';

export const createEnquirySchema = z.object({
  // Which company's funnel this lead came through — the slug from the public URL
  // (/:companySlug/enquiry). Optional: the bare, un-slugged funnel still posts without one and
  // falls back to LEGACY_COMPANY_ID, so existing links keep working. The controller is what
  // resolves it to a company id and rejects a slug that matches nothing.
  companySlug: z.string().min(1).optional(),
  goal: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  // StepContact.jsx's PhoneField always sends E.164 (e.g. "+14155550123") — same isValidPhoneNumber
  // check the client itself runs (client/src/components/enquiry/enquirySchema.js).
  phone: z.string().min(1).refine(isValidPhoneNumber, 'Enter a valid phone number'),
  preferredSlot: z.string().optional(),
  note: z.string().optional(),
});

// Every status transition appends to enquiry_history — nothing is ever overwritten (see
// enquiry.controller.js#updateEnquiry). Each status has its own required fields:
// - 'new': no extra fields (rarely used — mostly a reset/undo path).
// - 'contacted': conversation notes are required.
// - 'closed' ("Unsuccessful" in the UI): a reason is required.
// - 'follow-up': books a real call against the enquiry (no client account yet; see
//   docs/specs/2026-round2-fixes.md item 1). Host is an admin in the org — `assignedTo`, or
//   legacy `dietitian`; the controller defaults to the acting admin when both are omitted.
// - 'converted' ("Successfully Converted / Won" in the UI): the only transition that ever creates
//   the lead's client account (planId/planDuration/password required then, checked in the
//   controller since it depends on DB state — has this enquiry already been converted? — a static
//   schema can't see; omitted on a second Convert click, which is then just a no-op status change).
export const updateEnquirySchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('new') }),
  z.object({ status: z.literal('contacted'), note: z.string().min(1, 'Add a note about the conversation') }),
  z.object({ status: z.literal('closed'), note: z.string().min(1, 'Add a reason') }),
  z.object({
    status: z.literal('follow-up'),
    assignedTo: z.string().min(1).optional(),
    dietitian: z.string().min(1).optional(),
    scheduledAt: z.coerce.date(),
    note: z.string().optional(),
  }),
  z.object({
    status: z.literal('converted'),
    planId: z.string().min(1).optional(),
    planDuration: z.enum(PLAN_DURATIONS).optional(),
    password: z.string().min(8).optional(),
    assignedDietitian: z.string().min(1).nullable().optional(),
  }),
]);

export const listEnquiriesQuerySchema = z.object({
  status: z.enum(['new', 'contacted', 'follow-up', 'converted', 'closed']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
