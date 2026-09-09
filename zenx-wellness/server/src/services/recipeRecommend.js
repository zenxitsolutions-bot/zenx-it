function dietAllows(recipe, preference) {
  const type = recipe.dietType || '';
  const tags = recipe.tags ?? [];
  const vegan = type === 'Vegan' || tags.includes('Vegan');
  const vegetarian = vegan || type === 'Vegetarian' || tags.includes('Vegetarian');
  const egg = vegetarian || type === 'Eggetarian';

  if (preference === 'vegan') return vegan;
  if (preference === 'vegetarian') return vegetarian;
  if (preference === 'eggetarian') return egg;
  return true;
}

function allergyHit(recipe, allergies) {
  const raw = String(allergies ?? '').trim();
  if (!raw) return false;
  const hay = `${recipe.allergens ?? ''} ${recipe.ingredients ?? ''} ${recipe.title ?? ''}`.toLowerCase();
  return raw
    .split(/[,;/]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length >= 3)
    .some((item) => hay.includes(item));
}

function programGoals(programName) {
  const name = String(programName ?? '').toLowerCase();
  return {
    weightLoss: /weight\s*loss|fat\s*loss|slim/.test(name),
    weightGain: /weight\s*gain|muscle|bulk/.test(name),
    diabetic: /diabet/.test(name),
    heart: /heart|cardio|cholest/.test(name),
  };
}

export function scoreRecipe(recipe, { dietPreference, allergies, programName } = {}) {
  if (!dietAllows(recipe, dietPreference)) return null;
  if (allergyHit(recipe, allergies)) return null;

  const tags = recipe.tags ?? [];
  const goals = programGoals(programName);
  let score = 1;

  if (goals.weightLoss) {
    if (tags.includes('Weight Loss') || tags.includes('Low Calorie')) score += 5;
    if (tags.includes('High Protein')) score += 2;
    if (recipe.kcal && recipe.kcal <= 350) score += 2;
  }
  if (goals.weightGain) {
    if (tags.includes('Weight Gain') || tags.includes('High Protein')) score += 5;
    if (recipe.protein && recipe.protein >= 20) score += 2;
  }
  if (goals.diabetic) {
    if (tags.includes('Diabetic Friendly') || tags.includes('High Fiber')) score += 5;
    if (recipe.sugar != null && recipe.sugar <= 8) score += 2;
    if (recipe.sugar != null && recipe.sugar > 15) score -= 4;
  }
  if (goals.heart) {
    if (tags.includes('Heart Healthy') || tags.includes('High Fiber')) score += 5;
    if (recipe.fat != null && recipe.fat <= 10) score += 1;
  }
  if (tags.includes('High Protein')) score += 1;
  return score;
}

export function recommendRecipes(recipes, profile = {}) {
  return recipes
    .map((recipe) => ({ recipe, score: scoreRecipe(recipe, profile) }))
    .filter((row) => row.score != null)
    .sort((a, b) => b.score - a.score || a.recipe.title.localeCompare(b.recipe.title))
    .slice(0, 12)
    .map((row) => row.recipe);
}
