export const RECIPE_DIET_TYPES = ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan'];

export const DIETARY_TAGS = [
  'Weight Loss',
  'Weight Gain',
  'High Protein',
  'Low Carb',
  'Diabetic Friendly',
  'Heart Healthy',
  'High Fiber',
  'Vegetarian',
  'Vegan',
  'Gluten Free',
  'Low Calorie',
  'Kids Friendly',
];

export const RECIPE_CATEGORY_LABELS = {
  Smoothies: 'Smoothies & drinks',
  Breakfast: 'Breakfast',
  Lunch: 'Lunch',
  Dinner: 'Dinner',
  Snack: 'Snacks',
  Biryani: 'Healthy biryani',
};

export const FIXED_RECIPE_CATEGORIES = ['Smoothies', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Biryani'];

export function recipeCategoryLabel(mealType) {
  return RECIPE_CATEGORY_LABELS[mealType] ?? mealType;
}

export function isNoCookTime(cookTime) {
  if (!cookTime) return true;
  const value = String(cookTime).trim().toLowerCase();
  return value === 'no cooking' || value === '0 min' || value === '0';
}

export function recipeTimingLabel(recipe) {
  const parts = [];
  if (recipe?.prepTime) parts.push(`Prep ${recipe.prepTime}`);
  if (recipe?.cookTime) parts.push(isNoCookTime(recipe.cookTime) ? 'No cooking' : `Cook ${recipe.cookTime}`);
  if (recipe?.totalTime) parts.push(`Total ${recipe.totalTime}`);
  return parts.join(' · ');
}
