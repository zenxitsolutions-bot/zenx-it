import { FIXED_RECIPE_CATEGORIES as META_CATEGORIES } from './recipeMeta';

// Create/Edit Recipe form Category select. 'Custom' is a UI-only sentinel — never itself
// saved as a recipe's mealType; picking it reveals a free-text input whose value is saved instead.
export const RECIPE_CATEGORIES = [...META_CATEGORIES, 'Custom'];

export const FIXED_RECIPE_CATEGORIES = META_CATEGORIES;
