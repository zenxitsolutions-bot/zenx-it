import { z } from 'zod'

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'CUSTOM']
const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']

const positive = (max) => z.coerce.number().min(0).max(max)

export const createRecipeSchema = z.object({
  name: z.string().trim().min(2, { error: 'Recipe name is required' }).max(200),
  description: z.string().trim().max(2000).optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(150),
        quantity: z.union([z.number(), z.string().trim().max(50)]).optional(),
        unit: z.string().trim().max(50).optional(),
      }),
    )
    .max(100)
    .optional(),
  prepInstructions: z.string().trim().max(10000).optional(),
  mealType: z.enum(MEAL_TYPES, { error: 'Choose a valid meal type' }).optional(),
  calories: positive(20000).optional(),
  protein: positive(2000).optional(),
  carbs: positive(2000).optional(),
  fat: positive(2000).optional(),
  prepTimeMinutes: z.coerce.number().int().min(0).max(1440).optional(),
  servingSize: z.string().trim().max(100).optional(),
  mediaUrl: z.url({ error: 'Media must be a valid URL' }).max(500).optional(),
})

export const updateRecipeSchema = createRecipeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: 'Provide at least one field to update' })

export const recipeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
  mealType: z.enum(MEAL_TYPES).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
})

export const createExerciseSchema = z.object({
  name: z.string().trim().min(2, { error: 'Exercise name is required' }).max(200),
  description: z.string().trim().max(2000).optional(),
  instructions: z.string().trim().max(10000).optional(),
  targetMuscleGroup: z.string().trim().max(100).optional(),
  equipment: z.string().trim().max(150).optional(),
  difficulty: z.enum(DIFFICULTIES, { error: 'Choose a valid difficulty' }).optional(),
  mediaUrl: z.url({ error: 'Media must be a valid URL' }).max(500).optional(),
  exerciseType: z.string().trim().max(100).optional(),
  durationSeconds: z.coerce.number().int().min(0).max(86400).optional(),
  defaultSets: z.coerce.number().int().min(0).max(100).optional(),
  defaultRepetitions: z.coerce.number().int().min(0).max(1000).optional(),
  restTimeSeconds: z.coerce.number().int().min(0).max(3600).optional(),
})

export const updateExerciseSchema = createExerciseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: 'Provide at least one field to update' })

export const exerciseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
})

export const activeSchema = z.object({ isActive: z.boolean() })
