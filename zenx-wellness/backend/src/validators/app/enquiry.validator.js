import { z } from 'zod'
import { emailSchema, phoneSchema, timezoneSchema, uuid } from '../common.validator.js'
import { createClientSchema } from './client.validator.js'

/** CONVERTED is reached only through the convert endpoint. */
export const SETTABLE_STATUSES = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'LOST', 'NOT_INTERESTED']

export const createEnquirySchema = z.object({
  firstName: z.string().trim().min(1, { error: 'First name is required' }).max(100),
  lastName: z.string().trim().min(1, { error: 'Last name is required' }).max(100),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  source: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(5000).optional(),
  status: z.enum(SETTABLE_STATUSES).optional(),
  assignedToId: uuid.nullish(),
})

export const updateEnquirySchema = createEnquirySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: 'Provide at least one field to update' })

export const assignEnquirySchema = z.object({ assignedToId: uuid.nullable() })

export const commentSchema = z.object({
  body: z.string().trim().min(1, { error: 'Comment cannot be empty' }).max(5000),
})

export const createFollowUpSchema = z
  .object({
    dueAt: z.coerce.date({ error: 'Enter a valid follow-up date' }),
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
  .refine((value) => Object.keys(value).length > 0, { error: 'Provide at least one field to update' })

/** Conversion takes a full client payload; the prefill endpoint seeds the form. */
export const convertEnquirySchema = createClientSchema

export const enquiryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
  status: z.enum([...SETTABLE_STATUSES, 'CONVERTED']).optional(),
  assignedToId: uuid.optional(),
})
