import { z } from 'zod';
import { calendarDaySpan, MAX_PLAN_DAYS, toCalendarDate } from '../utils/calendarDate.js';

// mealType (spec §2026-round2-fixes item 4): free text, not the old fixed 4-value enum — the
// builder's dropdown still offers exactly those 4 plus a client-only 'Custom' sentinel that never
// itself reaches here, same convention as recipe.schema.js's own mealType. recipe/customTitle are
// mutually exclusive (a slot references a catalog recipe OR a manually typed one, or neither) —
// mirrored at the DB level by plan_meals' own CHECK constraint, not just here.
const optionalMacro = z.number().int().nonnegative().nullable().optional();

const recipeOverride = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    emoji: z.string().max(16).optional(),
    ingredients: z.string().max(20000).optional(),
    instructions: z.string().max(20000).optional(),
    portionSize: z.string().max(100).nullable().optional(),
    prepTime: z.string().max(100).optional(),
    cookTime: z.string().max(100).nullable().optional(),
    totalTime: z.string().max(100).nullable().optional(),
    kcal: optionalMacro,
    protein: optionalMacro,
    carbs: optionalMacro,
    fat: optionalMacro,
    fiber: optionalMacro,
    sugar: optionalMacro,
    allergens: z.string().max(4000).nullable().optional(),
    healthNotes: z.string().max(4000).nullable().optional(),
    servings: z.number().positive().max(50).optional(),
  })
  .nullable()
  .optional();

const mealSlot = z
  .object({
    day: z.string().min(1),
    time: z.string().min(1),
    mealType: z.string().min(1).max(50),
    recipe: z.string().nullable().optional(),
    customTitle: z.string().max(255).nullable().optional(),
    notes: z.string().nullable().optional(),
    completed: z.boolean().optional(),
    swapRequested: z.boolean().optional(),
    servings: z.number().positive().max(50).optional(),
    recipeOverride: recipeOverride,
  })
  .refine((data) => !(data.recipe && data.customTitle), {
    message: 'A meal slot can reference a catalog recipe or a custom recipe name, not both',
    path: ['customTitle'],
  });

// Civil day only — never coerce through Date. `z.coerce.date()` on "2026-09-03" becomes a UTC
// midnight instant; writing that through mysql2 then reading it back as JSON is what made a
// Thursday start land on Sunday (or the previous day) for a client in another timezone.
const calendarDate = z
  .union([z.string(), z.date()])
  .transform((value) => toCalendarDate(value instanceof Date ? value.toISOString() : value))
  .refine((value) => Boolean(value), 'Use a calendar date (YYYY-MM-DD)');

export const createPlanSchema = z
  .object({
    client: z.string().min(1),
    // A dietitian caller never sends this — the server derives it from the caller. Only an admin
    // assigning a plan on a dietitian's behalf supplies it explicitly.
    dietitian: z.string().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    week: calendarDate,
    weekEnd: calendarDate,
    meals: z.array(mealSlot).optional(),
    reusable: z.boolean().optional(),
  })
  .refine((data) => data.weekEnd >= data.week, {
    message: 'End date cannot be before the start date',
    path: ['weekEnd'],
  })
  .refine((data) => calendarDaySpan(data.week, data.weekEnd) <= MAX_PLAN_DAYS, {
    message: `Plan cannot be longer than ${MAX_PLAN_DAYS} days`,
    path: ['weekEnd'],
  });

export const updatePlanSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    client: z.string().min(1).optional(),
    week: calendarDate.optional(),
    weekEnd: calendarDate.optional(),
    meals: z.array(mealSlot).optional(),
    published: z.boolean().optional(),
    reusable: z.boolean().optional(),
    // Dietitian resolving a client's swap request — save the new recipe, then email the client.
    notifySwaps: z.boolean().optional(),
    swapResolutions: z
      .array(
        z.object({
          day: z.string().min(1),
          time: z.string().min(1),
          previousMeal: z.string().min(1),
        })
      )
      .optional(),
  })
  .refine((data) => Boolean(data.week) === Boolean(data.weekEnd), {
    message: 'Week start and week end must be sent together',
    path: ['weekEnd'],
  })
  .refine((data) => !data.week || !data.weekEnd || data.weekEnd >= data.week, {
    message: 'End date cannot be before the start date',
    path: ['weekEnd'],
  })
  .refine((data) => !data.week || !data.weekEnd || calendarDaySpan(data.week, data.weekEnd) <= MAX_PLAN_DAYS, {
    message: `Plan cannot be longer than ${MAX_PLAN_DAYS} days`,
    path: ['weekEnd'],
  });

export const updateMealStatusSchema = z
  .object({
    completed: z.boolean().optional(),
    swapRequested: z.boolean().optional(),
  })
  .refine((data) => data.completed !== undefined || data.swapRequested !== undefined, {
    message: 'Provide completed or swapRequested',
  });
