import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

const SERVICE = ['Website', 'Digital Marketing', 'Business Software', 'Small Business POS', 'ZenX Dietitian application', 'Something else'];
const SOURCE = ['Website', 'Google', 'Facebook', 'Instagram', 'Referral', 'Direct', 'Other'];
const PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'HOT'];
const STATUS = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'LOST'];

// An unselected field is genuinely unknown, not a made-up service/source choice. All optional
// values share the same null representation, whether the form omits them or sends empty strings.
const optionalText = z.string().trim().nullish().transform((value) => value || null);
const optionalSelection = (options) => z.preprocess(
  (value) => typeof value === 'string' ? value.trim() || null : value,
  z.enum(options).nullish()
).transform((value) => value ?? null);

export const createEnquirySchema = z.object({
  companyName: optionalText,
  contactName: z.string().trim().min(1, 'Enter your name'),
  // Both public and staff enquiry forms use the shared phone input's international E.164 value.
  phone: z.string().trim().min(1, 'Enter your phone number')
    .refine((value) => isValidPhoneNumber(value), 'Enter a valid phone number'),
  email: z.string().trim().email('Enter a valid email address'),
  website: optionalText,
  service: optionalSelection(SERVICE),
  source: optionalSelection(SOURCE),
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  state: optionalText,
  zip: optionalText,
  country: optionalText,
  notes: optionalText,
});

export const patchEnquirySchema = z.object({
  priority: z.enum(PRIORITY).optional(),
  assignedTo: z.string().nullable().optional(),
  estimatedValue: z.number().nullable().optional(),
});

export const updateEnquiryStatusSchema = z.object({
  status: z.enum(STATUS),
});
