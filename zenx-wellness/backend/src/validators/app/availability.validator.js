import { z } from 'zod'
import { timezoneSchema } from '../common.validator.js'

const timeOfDay = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Use 24-hour HH:mm, e.g. 09:00' })

// ISO weekday, 1 = Monday through 7 = Sunday.
const weekday = z.coerce.number().int().min(1).max(7)

export const setAvailabilitySchema = z.object({
  // One zone for the whole pattern — the staff member's own working timezone.
  timezone: timezoneSchema,
  windows: z
    .array(
      z.object({
        dayOfWeek: weekday,
        startTime: timeOfDay,
        endTime: timeOfDay,
        isActive: z.boolean().optional(),
      }),
    )
    .max(50),
})

export const createBlockSchema = z
  .object({
    startDate: z.coerce.date({ error: 'Enter a valid start date' }),
    endDate: z.coerce.date({ error: 'Enter a valid end date' }),
    isFullDay: z.boolean().default(true),
    startTime: timeOfDay.optional(),
    endTime: timeOfDay.optional(),
    timezone: timezoneSchema,
    reason: z.string().trim().max(255).optional(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    error: 'End date must be on or after the start date',
    path: ['endDate'],
  })

export const blockListQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export const availabilityCheckSchema = z.object({
  at: z.coerce.date({ error: 'Provide the instant to check as an ISO datetime' }),
  durationMinutes: z.coerce.number().int().min(5).max(480).default(30),
})

export const slotsQuerySchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Use YYYY-MM-DD' }),
  durationMinutes: z.coerce.number().int().min(5).max(480).default(30),
})
