const RECIPE_OVERRIDE_KEYS = [
  'title',
  'emoji',
  'ingredients',
  'instructions',
  'portionSize',
  'prepTime',
  'cookTime',
  'totalTime',
  'kcal',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'allergens',
  'healthNotes',
  'servings',
];

export function parseRecipeOverride(value) {
  if (value == null || value === '') return null;
  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const key of RECIPE_OVERRIDE_KEYS) {
    if (raw[key] !== undefined) out[key] = raw[key];
  }
  return Object.keys(out).length ? out : null;
}

export function mergeRecipeWithOverride(recipe, override) {
  const parsed = parseRecipeOverride(override);
  if (!recipe || !parsed) return recipe ?? null;
  return {
    ...recipe,
    ...parsed,
    _id: recipe._id ?? recipe.id,
    id: recipe.id ?? recipe._id,
    imageUrl: recipe.imageUrl,
  };
}

export function mealDisplayTitle(meal, recipeList = []) {
  if (meal?.recipeOverride?.title) return meal.recipeOverride.title;
  if (meal?.recipe?.title) return meal.recipe.title;
  const catalog = recipeList.find((recipe) => recipe._id === meal?.recipeId);
  return catalog?.title || meal?.customTitle || meal?.mealType || 'meal';
}
