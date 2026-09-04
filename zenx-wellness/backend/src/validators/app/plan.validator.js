import { z } from 'zod'
import { uuid } from '../common.validator.js'

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'CUSTOM']
const weekday = z.coerce.number().int().min(1).max(7)

/**
 * A meal slot. The recipe-or-custom rule is enforced in the service so the
 * error can name the offending index consistently across create, update and
 * per-day edits.
 */
const dietItem = z.object({
  dayOfWeek: weekday,
  mealType: z.enum(MEAL_TYPES, { error: 'Choose a valid meal type' }),
  sortOrder: z.coerce.number().int().min(0).max(100).default(0),
  recipeId: uuid.nullish(),
  customTitle: z.string().trim().max(200).nullish(),
  customInstructions: z.string().trim().max(10000).nullish(),
  notes: z.string().trim().max(2000).nullish(),
})

export const createDietPlanSchema = z.object({
  name: z.string().trim().min(2, { error: 'Plan name is required' }).max(200),
  description: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
  items: z.array(dietItem).max(200).default([]),
})

export const updateDietPlanSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(2000).nullish(),
    notes: z.string().trim().max(5000).nullish(),
    items: z.array(dietItem).max(200).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { error: 'Provide at least one field to update' })

export const setDietPlanDaySchema = z.object({
  items: z.array(dietItem.omit({ dayOfWeek: true })).max(40),
})

export const copyPlanSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
})

const workoutItem = z.object({
  dayOfWeek: weekday.nullish(),
  sortOrder: z.coerce.number().int().min(0).max(200).default(0),
  exerciseId: uuid,
  sets: z.coerce.number().int().min(0).max(100).nullish(),
  repetitions: z.coerce.number().int().min(0).max(1000).nullish(),
  durationSeconds: z.coerce.number().int().min(0).max(86400).nullish(),
  restTimeSeconds: z.coerce.number().int().min(0).max(3600).nullish(),
  instructions: z.string().trim().max(5000).nullish(),
})

export const createWorkoutPlanSchema = z.object({
  name: z.string().trim().min(2, { error: 'Plan name is required' }).max(200),
  description: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
  planType: z.enum(['DAILY', 'WEEKLY'], { error: 'Plan type must be DAILY or WEEKLY' }).optional(),
  items: z.array(workoutItem).max(200).default([]),
})

export const updateWorkoutPlanSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(2000).nullish(),
    notes: z.string().trim().max(5000).nullish(),
    planType: z.enum(['DAILY', 'WEEKLY']).optional(),
    items: z.array(workoutItem).max(200).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { error: 'Provide at least one field to update' })

export const assignPlanSchema = z.object({
  // An empty array clears every assignment.
  clientIds: z.array(uuid).max(200),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

export const planListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
  clientId: uuid.optional(),
  planType: z.enum(['DAILY', 'WEEKLY']).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
})

export const activeSchema = z.object({ isActive: z.boolean() })
