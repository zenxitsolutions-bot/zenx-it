import { z } from 'zod';

const CONTACT_TYPE = ['Phone Call', 'Email', 'WhatsApp', 'Meeting', 'Video Call', 'Other'];
const OUTCOME = ['Interested', 'Needs More Information', 'Not Interested', 'Call Again', 'Proposal Requested', 'Ready to Convert', 'Other'];

export const createInteractionSchema = z.object({
  enquiryId: z.string().min(1),
  contactType: z.enum(CONTACT_TYPE),
  comment: z.string().min(1),
  outcome: z.enum(OUTCOME),
  nextAction: z.string().optional().nullable(),
});
