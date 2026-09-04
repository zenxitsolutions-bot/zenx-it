import { z } from 'zod'
import { isValidTimezone } from '../utils/timezone.js'

export const uuid = z.uuid({ error: 'Must be a valid id' })

export const timezoneSchema = z
  .string({ error: 'Timezone is required' })
  .trim()
  .refine(isValidTimezone, { error: 'Must be a valid IANA timezone, e.g. America/Chicago' })

export const emailSchema = z
  .string({ error: 'Email is required' })
  .trim()
  .min(1, { error: 'Email is required' })
  .pipe(z.email({ error: 'Enter a valid email address' }))
  .transform((value) => value.toLowerCase())

export const phoneSchema = z
  .string()
  .trim()
  .max(30, { error: 'Phone number is too long' })
  .regex(/^[+()\d\s-]{6,30}$/, { error: 'Enter a valid phone number' })

export const idParamSchema = z.object({ id: uuid })

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
})

/** A date that must land in the future — used for scheduling. */
export const futureDate = z.coerce
  .date({ error: 'Enter a valid date' })
  .refine((date) => date.getTime() > Date.now(), { error: 'Date must be in the future' })
