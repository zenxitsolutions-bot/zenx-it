import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

const SERVICE = ['Website', 'Digital Marketing', 'Business Software', 'Small Business POS', 'ZenX Dietitian application', 'Something else'];
const SOURCE = ['Website', 'Google', 'Facebook', 'Instagram', 'Referral', 'Direct', 'Other'];
const PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'HOT'];
const STATUS = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'LOST'];

export const createEnquirySchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  // The marketing site's ContactForm and admin's AddEnquiryModal/ConvertFlow all submit through
  // the same PhoneField/PhoneInput components, which always produce E.164 (e.g. "+14155550123")
  // or '' — phone stays optional here (the marketing site's own contact form has always treated
  // it that way), but a non-empty value must be a real, dialable number.
  phone: z.string().refine((v) => !v || isValidPhoneNumber(v), 'Enter a valid phone number'),
  email: z.string().email(),
  website: z.string().optional().nullable(),
  service: z.enum(SERVICE),
  source: z.enum(SOURCE),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const patchEnquirySchema = z.object({
  priority: z.enum(PRIORITY).optional(),
  assignedTo: z.string().nullable().optional(),
  estimatedValue: z.number().nullable().optional(),
});

export const updateEnquiryStatusSchema = z.object({
  status: z.enum(STATUS),
});
