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
