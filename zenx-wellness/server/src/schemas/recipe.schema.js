import { z } from 'zod';

export const createRecipeSchema = z.object({
  title: z.string().min(1),
  emoji: z.string().optional(),
  // Free text (2026-08-22) — the client offers Breakfast/Lunch/Dinner/Snack plus a "Custom"
  // option that reveals a text input; whatever value results is saved here as-is.
  mealType: z.string().trim().min(1).max(50),
  prepTime: z.string().min(1),
  tags: z.array(z.string()).optional(),
  kcal: z.number().optional(),
  protein: z.number().optional(),
  ingredients: z.string().min(1),
  instructions: z.string().min(1),
});

export const updateRecipeSchema = createRecipeSchema.partial();
