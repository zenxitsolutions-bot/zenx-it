import { z } from 'zod';
import { addCalendarDays, toCalendarDate } from '../utils/calendarDate.js';

// mealType (spec §2026-round2-fixes item 4): free text, not the old fixed 4-value enum — the
// builder's dropdown still offers exactly those 4 plus a client-only 'Custom' sentinel that never
// itself reaches here, same convention as recipe.schema.js's own mealType. recipe/customTitle are
// mutually exclusive (a slot references a catalog recipe OR a manually typed one, or neither) —
// mirrored at the DB level by plan_meals' own CHECK constraint, not just here.
const mealSlot = z
  .object({
    day: z.string().min(1),
    time: z.string().min(1),
    mealType: z.string().min(1).max(50),
    recipe: z.string().nullable().optional(),
    customTitle: z.string().max(255).nullable().optional(),
    notes: z.string().nullable().optional(),
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
    title: z.string().optional(),
    week: calendarDate,
    // The end of the diet week — always exactly 6 days after `week` (the client auto-computes and
    // locks this in the UI; this refine is the authoritative boundary check).
    weekEnd: calendarDate,
    meals: z.array(mealSlot).optional(),
  })
  .refine((data) => data.weekEnd === addCalendarDays(data.week, 6), {
    message: 'Week end must be 6 days after week start',
    path: ['weekEnd'],
  });

export const updatePlanSchema = z.object({
  title: z.string().optional(),
  meals: z.array(mealSlot).optional(),
  published: z.boolean().optional(),
});

export const updateMealStatusSchema = z
  .object({
    completed: z.boolean().optional(),
    swapRequested: z.boolean().optional(),
  })
  .refine((data) => data.completed !== undefined || data.swapRequested !== undefined, {
    message: 'Provide completed or swapRequested',
  });
