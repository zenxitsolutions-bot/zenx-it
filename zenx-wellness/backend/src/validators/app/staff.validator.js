import { z } from 'zod'
import { emailSchema, phoneSchema, timezoneSchema, uuid } from '../common.validator.js'

export const createStaffSchema = z.object({
  firstName: z.string().trim().min(1, { error: 'First name is required' }).max(100),
  lastName: z.string().trim().min(1, { error: 'Last name is required' }).max(100),
  email: emailSchema,
  phone: phoneSchema.optional(),
  username: z
    .string()
    .trim()
    .min(3, { error: 'Username must be at least 3 characters' })
    .max(100)
    .regex(/^[a-zA-Z0-9._-]+$/, { error: 'Username may use letters, digits, dot, underscore, hyphen' })
    .optional(),
  timezone: timezoneSchema.optional(),
  specialization: z.string().trim().max(150).optional(),
  address: z.string().trim().max(1000).optional(),
  bio: z.string().trim().max(2000).optional(),
})

export const updateStaffSchema = createStaffSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: 'Provide at least one field to update' })

export const staffStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'], { error: 'Choose a valid status' }),
})

export const staffListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
})

export const setAssignmentsSchema = z.object({
  // First entry becomes the primary assignment; an empty array clears them.
  staffUserIds: z.array(uuid).max(20),
})
