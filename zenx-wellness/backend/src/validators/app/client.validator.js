import { z } from 'zod'
import { emailSchema, phoneSchema, timezoneSchema, uuid } from '../common.validator.js'

const CALLING_FREQUENCIES = [
  'DAILY',
  'EVERY_2_DAYS',
  'EVERY_3_DAYS',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'CUSTOM',
]

// "HH:mm" wall-clock, kept as local time so the slot survives a DST shift.
const timeOfDay = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Use 24-hour HH:mm, e.g. 09:30' })

// ISO weekday numbers, 1 = Monday … 7 = Sunday.
const weekday = z.coerce.number().int().min(1).max(7)

const measurement = (max) => z.coerce.number().positive().max(max)

const clientCore = {
  firstName: z.string().trim().min(1, { error: 'First name is required' }).max(100),
  lastName: z.string().trim().min(1, { error: 'Last name is required' }).max(100),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  dob: z.coerce
    .date({ error: 'Enter a valid date of birth' })
    .refine((date) => date < new Date(), { error: 'Date of birth must be in the past' })
    .optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  address: z.string().trim().max(1000).optional(),
  country: z.string().trim().max(100).optional(),
  timezone: timezoneSchema.optional(),

  // Diet preferences
  dietType: z.enum(['VEGETARIAN', 'NON_VEGETARIAN']).optional(),
  foodPreferences: z.array(z.string().trim().max(100)).max(50).optional(),
  foodAllergies: z.array(z.string().trim().max(100)).max(50).optional(),
  mealsPerDay: z.coerce.number().int().min(1).max(12).optional(),
  preferredMealTimes: z.record(z.string(), timeOfDay).optional(),

  // Measurements — bmi is derived server-side, never accepted from the client.
  heightCm: measurement(300).optional(),
  weightKg: measurement(700).optional(),
  targetWeightKg: measurement(700).optional(),
  waistCm: measurement(300).optional(),
  hipCm: measurement(300).optional(),
  extraMeasurements: z.record(z.string(), z.union([z.number(), z.string()])).optional(),

  // Calling preferences — stored as rules; Phase 2D's scheduler consumes them.
  callingFrequency: z.enum(CALLING_FREQUENCIES).optional(),
  everyXDays: z.coerce.number().int().min(1).max(365).optional(),
  specificDaysOfWeek: z.array(weekday).max(7).optional(),
  specificDayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  preferredCallingDays: z.array(weekday).max(7).optional(),
  preferredCallingTime: timeOfDay.optional(),
  callingTimezone: timezoneSchema.optional(),
  callDurationMinutes: z.coerce.number().int().min(5).max(480).optional(),
  assignedDietitianId: uuid.nullish(),
  assignedTrainerId: uuid.nullish(),
  callStartDate: z.coerce.date().optional(),
  callEndDate: z.coerce.date().optional(),
  numberOfScheduledCalls: z.coerce.number().int().min(1).max(1000).optional(),
}

/**
 * A call window is bounded either by an end date or by a fixed number of calls.
 * Accepting both leaves the scheduler with two conflicting stop conditions.
 */
const callWindowRules = (schema) =>
  schema
    .refine((value) => !(value.callEndDate && value.numberOfScheduledCalls), {
      error: 'Set either an end date or a number of calls, not both',
      path: ['numberOfScheduledCalls'],
    })
    .refine((value) => !value.callEndDate || !value.callStartDate || value.callEndDate > value.callStartDate, {
      error: 'Call end date must be after the start date',
      path: ['callEndDate'],
    })

export const createClientSchema = callWindowRules(z.object(clientCore))

export const updateClientSchema = callWindowRules(
  z.object(clientCore).partial().refine((value) => Object.keys(value).length > 0, {
    error: 'Provide at least one field to update',
  }),
)

export const clientStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'], { error: 'Status must be ACTIVE or INACTIVE' }),
})

export const assignStaffSchema = z
  .object({
    assignedDietitianId: uuid.nullish(),
    assignedTrainerId: uuid.nullish(),
  })
  .refine((value) => Object.keys(value).length > 0, { error: 'Provide at least one assignment' })

export const clientListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  assignedDietitianId: uuid.optional(),
  assignedTrainerId: uuid.optional(),
})
