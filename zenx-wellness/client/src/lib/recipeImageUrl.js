import { normalizeRecipeImageUrl } from '../../../shared/recipeImageUrls.js';
import { GENERATED_RECIPE_IMAGES } from './generatedRecipeImages.js';

export function recipeImageUrl(recipe) {
  const originalUrl = recipe?.imageUrl || '';
  const catalogPhoto = recipe?.visibility === 'shared' && (
    !originalUrl || originalUrl.startsWith('/images/recipe-catalog/') ||
    /^https:\/\/(images\.unsplash\.com|commons\.wikimedia\.org)\//i.test(originalUrl)
  );
  // A meal-specific title need not exist in the catalog registry. Keep the recipe's
  // own photo in that case, including for non-shared copies with legacy PNG URLs.
  const selectedUrl = catalogPhoto ? GENERATED_RECIPE_IMAGES[recipe.title] || originalUrl : originalUrl;
  return normalizeRecipeImageUrl(selectedUrl);
}
