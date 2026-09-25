import { CONVERTED_RECIPE_IMAGE_BASENAMES } from './recipeImageAssets.js';

const convertedBasenames = new Set(CONVERTED_RECIPE_IMAGE_BASENAMES);
const catalogPath = /^\/images\/recipe-catalog\/([^/?#]+)\.(png|webp)([?#].*)?$/;

function convertedCatalogMatch(value) {
  if (typeof value !== 'string') return null;
  const match = catalogPath.exec(value);
  return match && convertedBasenames.has(match[1]) ? match : null;
}

// Existing database records and copied recipes can retain their old PNG URLs.
// Only assets in the verified conversion manifest are rewritten: uploads, remote
// URLs, and any future/unconverted catalog files must retain their original URL.
export function normalizeRecipeImageUrl(value) {
  const match = convertedCatalogMatch(value);
  if (!match || match[2] !== 'png') return value;
  return `/images/recipe-catalog/${match[1]}.webp${match[3] || ''}`;
}

export function isKnownRecipeCatalogImageUrl(value) {
  return Boolean(convertedCatalogMatch(value));
}
