import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

export const provisionCustomerSchema = z.object({
  enquiryId: z.string().optional().nullable(),
  companyName: z.string().min(1),
  companySlug: z.string().min(1),
  // The company's own public website, carried through to wellness-app in the handoff token so a
  // tenant's portal can link back to it. Optional and free-form-ish: an enquiry's website field
  // (the public contact form) is commonly typed without a scheme, so this is normalised in the
  // controller rather than rejected here.
  website: z.string().max(1024).optional().nullable(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  // AddCustomerModal/ConvertFlow submit through PhoneField, which always produces E.164 (e.g.
  // "+14155550123") — same isValidPhoneNumber check enquiry.schema.js runs.
  phone: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || isValidPhoneNumber(v), 'Enter a valid phone number'),
  email: z.string().email(),
  jobTitle: z.string().optional().nullable(),
  applicationSlugs: z.array(z.string()).min(1),
  password: z.string().min(8),
});

export const issueHandoffTokenSchema = z.object({
  applicationSlug: z.string().min(1),
  companyId: z.string().min(1),
});
