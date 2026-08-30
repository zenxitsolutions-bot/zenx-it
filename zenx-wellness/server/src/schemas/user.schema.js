import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { PLAN_DURATIONS } from '../constants/planDurations.js';
import { isValidTimezone } from '../services/timezoneService.js';

// Only meaningful for role: 'client' — applied conditionally in the controller, same convention
// as assignedDietitian.
const programPlan = z.string().min(1).nullable().optional();
const planDuration = z.enum(PLAN_DURATIONS).nullable().optional();

// The client's PhoneInput (client/src/components/ui/phone-input.jsx) always sends E.164 (e.g.
// "+14155550123") — a real, dialable number for a real country, not just "looks phone-shaped".
// isValidPhoneNumber is the same check the client runs, so a client that passed its own form
// validation never bounces off this one.
const phone = z
  .string()
  .trim()
  .refine(isValidPhoneNumber, 'Enter a valid phone number');

const address = z.string().trim().min(1, 'Enter an address').max(255);

const email = z.string().trim().toLowerCase().email('Enter a valid email address');

// '' alongside the real pattern so a controlled form field that hasn't been touched (or was
// cleared) can be submitted without failing format validation — emptiness vs. "wrong format" are
// different failures, and only fields actually required (see the dietitian superRefine below)
// need to reject empty.
const optionalPhone = z.union([phone, z.literal('')]).optional();
const optionalAddress = z.union([address, z.literal('')]).optional();
const qualifications = z.string().trim().max(2000).optional();
const accountStatus = z.enum(['active', 'inactive', 'suspended']).optional();

// Must be a real IANA zone name — isValidTimezone (timezoneService.js) uses Intl.DateTimeFormat's
// own RangeError as the validity check, the standard way to validate one without a lookup table
// (no timezone library ships a full, current IANA list to hand-check against; the JS runtime's own
// tz database already is that list). Applies to every role now — see the column comment in
// schema.sql for how a dietitian's timezone is additionally load-bearing for availability.
const timezone = z.string().min(1).refine(isValidTimezone, { message: 'Not a valid IANA timezone name (e.g. "Asia/Kolkata")' }).optional();

// ISO 3166-1 alpha-2, uppercased — display/preference only, never used to derive a timezone.
const country = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Use a 2-letter country code (e.g. "US")')
  .optional();

// A literal date-fns format token string — validated for shape only (not "is this a real pattern",
// which would need to actually run date-fns' formatter; a garbage pattern just renders oddly rather
// than throwing, so a loose length/character cap is enough to stop anything pathological).
const dateFormat = z.string().trim().min(1).max(20).optional();
const timeFormat = z.enum(['12h', '24h']).optional();

export const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: optionalPhone,
  assignedDietitian: z.string().min(1).nullable().optional(),
  timezone,
  country,
  dateFormat,
  timeFormat,
});

// email/phone/address/qualifications/accountStatus are new (spec §2026-round2-fixes items 2/3).
// email uniqueness (excluding the user's own current row) is checked in the controller — a static
// schema can't see other rows. Reachable by an admin editing anyone, or a dietitian editing their
// own assigned client's contact info only (see user.controller.js#updateUser's ownership check) —
// the schema itself doesn't need to know which caller it is; the controller enforces which fields
// each caller may actually send.
export const updateUserSchema = z.object({
  role: z.enum(['client', 'dietitian', 'admin']).optional(),
  assignedDietitian: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  email: email.optional(),
  phone: optionalPhone,
  address: optionalAddress,
  qualifications,
  accountStatus,
  programPlan,
  planDuration,
  timezone,
  country,
  dateFormat,
  timeFormat,
});

export const createUserSchema = z
  .object({
    name: z.string().min(1),
    email,
    password: z.string().min(8),
    role: z.enum(['client', 'dietitian', 'admin']),
    phone: optionalPhone,
    address: optionalAddress,
    qualifications,
    assignedDietitian: z.string().min(1).nullable().optional(),
    programPlan,
    planDuration,
    // Optional at creation — an admin can set it up front instead of relying on the DB's 'UTC'
    // default + a later PATCH, but nothing requires it (spec item 1 only requires phone/address
    // for a dietitian, not timezone).
    timezone,
  })
  // Email is already required for every role above; phone/address are only required for a
  // dietitian (spec item 1's explicit "Add and require") — a client/admin account has no use for
  // either at creation time, matching how programPlan/planDuration are conditionally required in
  // the opposite direction (client-only).
  .superRefine((data, ctx) => {
    if (data.role !== 'dietitian') return;
    if (!data.phone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phone number is required for a dietitian', path: ['phone'] });
    }
    if (!data.address) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Address is required for a dietitian', path: ['address'] });
    }
  });
