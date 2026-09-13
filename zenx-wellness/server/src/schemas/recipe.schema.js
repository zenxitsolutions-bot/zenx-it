import { z } from 'zod';
import { RECIPE_DIET_TYPES } from '../constants/recipeMeta.js';

const optionalInt = z.number().int().nonnegative().nullable().optional();
const optionalText = z.string().trim().max(4000).nullable().optional();

export const createRecipeSchema = z.object({
  title: z.string().min(1),
  emoji: z.string().optional(),
  mealType: z.string().trim().min(1).max(50),
  prepTime: z.string().min(1),
  cookTime: z.string().trim().max(100).nullable().optional(),
  totalTime: z.string().trim().max(100).nullable().optional(),
  cuisine: z.string().trim().max(80).optional(),
  dietType: z.enum(RECIPE_DIET_TYPES).optional(),
  servings: z.number().positive().max(50).optional(),
  tags: z.array(z.string()).optional(),
  kcal: optionalInt,
  protein: optionalInt,
  carbs: optionalInt,
  fat: optionalInt,
  fiber: optionalInt,
  sugar: optionalInt,
  portionSize: z.string().trim().max(100).nullable().optional(),
  allergens: optionalText,
  suitableMealType: z.string().trim().max(50).nullable().optional(),
  imageUrl: z.string().trim().max(1024).nullable().optional(),
  healthNotes: optionalText,
  ingredients: z.string().min(1),
  instructions: z.string().min(1),
});

export const updateRecipeSchema = createRecipeSchema.partial();
