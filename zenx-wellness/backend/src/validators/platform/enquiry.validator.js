import { z } from 'zod'
import { emailSchema, phoneSchema, timezoneSchema, uuid } from '../common.validator.js'
import { companyAdminSchema, subscriptionWindow } from './company.validator.js'
import { isValidSubdomain } from '../../utils/subdomain.js'

/** CONVERTED is set only by the convert endpoint, never by a plain update. */
export const SETTABLE_ENQUIRY_STATUSES = [
  'NEW',
  'CONTACTED',
  'FOLLOW_UP',
  'LOST',
  'NOT_INTERESTED',
  'FUTURE_FOLLOW_UP',
]

export const createEnquirySchema = z.object({
  companyName: z.string().trim().min(2, { error: 'Company name is required' }).max(150),
  contactName: z.string().trim().min(2, { error: 'Contact name is required' }).max(150),
  email: emailSchema,
  phone: phoneSchema.optional(),
  source: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(5000).optional(),
  status: z.enum(SETTABLE_ENQUIRY_STATUSES).optional(),
  assignedToId: uuid.nullish(),
})

export const updateEnquirySchema = createEnquirySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { error: 'Provide at least one field to update' },
)

export const assignEnquirySchema = z.object({
  // null clears the assignment.
  assignedToId: uuid.nullable(),
})

export const enquiryCommentSchema = z.object({
  body: z.string().trim().min(1, { error: 'Comment cannot be empty' }).max(5000),
})

export const createFollowUpSchema = z
  .object({
    dueAt: z.coerce.date({ error: 'Enter a valid follow-up date' }),
    // The zone the follow-up was booked in, kept so it can be rendered back
    // correctly across DST rather than with a frozen offset.
    timezone: timezoneSchema,
    remindAt: z.coerce.date({ error: 'Enter a valid reminder date' }).optional(),
    notes: z.string().trim().max(5000).optional(),
  })
  .refine((value) => !value.remindAt || value.remindAt <= value.dueAt, {
    error: 'Reminder must be at or before the follow-up time',
    path: ['remindAt'],
  })

export const updateFollowUpSchema = z
  .object({
    dueAt: z.coerce.date().optional(),
    timezone: timezoneSchema.optional(),
    remindAt: z.coerce.date().nullish(),
    status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
    outcome: z.string().trim().max(5000).optional(),
    notes: z.string().trim().max(5000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Provide at least one field to update',
  })

/** Payload for converting a won enquiry into a live company. */
export const convertEnquirySchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    logoUrl: z.url().max(500).optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    address: z.string().trim().max(1000).optional(),
    country: z.string().trim().min(2, { error: 'Country is required' }).max(100),
    timezone: timezoneSchema,
    subdomain: z
      .string()
      .trim()
      .toLowerCase()
      .refine(isValidSubdomain, { error: 'Subdomain must be 3-63 characters, letters, digits and hyphens' })
      .optional(),
    ...subscriptionWindow,
    admin: companyAdminSchema,
  })
  .refine((value) => value.subEndDate > value.subStartDate, {
    error: 'Subscription end date must be after the start date',
    path: ['subEndDate'],
  })

export const enquiryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
  status: z
    .enum([...SETTABLE_ENQUIRY_STATUSES, 'CONVERTED'])
    .optional(),
  assignedToId: uuid.optional(),
})
