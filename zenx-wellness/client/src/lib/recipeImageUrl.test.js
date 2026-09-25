import test from 'node:test';
import assert from 'node:assert/strict';
import { CONVERTED_RECIPE_IMAGE_BASENAMES } from '../../../shared/recipeImageAssets.js';
import { normalizeRecipeImageUrl, isKnownRecipeCatalogImageUrl } from '../../../shared/recipeImageUrls.js';
import { GENERATED_RECIPE_IMAGES } from './generatedRecipeImages.js';
import { recipeImageUrl } from './recipeImageUrl.js';

const png = '/images/recipe-catalog/0001-banana-oats-smoothie.png';
const webp = '/images/recipe-catalog/0001-banana-oats-smoothie.webp';

test('every converted image has an exact, idempotent legacy URL mapping', () => {
  assert.equal(CONVERTED_RECIPE_IMAGE_BASENAMES.length, 891);
  assert.equal(new Set(CONVERTED_RECIPE_IMAGE_BASENAMES).size, 891);
  for (const basename of CONVERTED_RECIPE_IMAGE_BASENAMES) {
    const legacy = `/images/recipe-catalog/${basename}.png`;
    const optimized = `/images/recipe-catalog/${basename}.webp`;
    assert.equal(normalizeRecipeImageUrl(legacy), optimized);
    assert.equal(normalizeRecipeImageUrl(optimized), optimized);
    assert.equal(isKnownRecipeCatalogImageUrl(legacy), true);
    assert.equal(isKnownRecipeCatalogImageUrl(optimized), true);
  }
});

test('normalization preserves queries and fragments without rewriting other URLs', () => {
  assert.equal(normalizeRecipeImageUrl(`${png}?v=2#photo`), `${webp}?v=2#photo`);
  assert.equal(normalizeRecipeImageUrl(`${png}#photo`), `${webp}#photo`);
  for (const original of [
    undefined, null, '', '/images/recipe-catalog/unknown.png',
    '/images/recipe-catalog/0001-banana-oats-smoothie.jpg',
    '0001-banana-oats-smoothie.png', '/uploads/0001-banana-oats-smoothie.png',
    `https://example.com${png}`, `//example.com${png}`, `images/recipe-catalog/0001-banana-oats-smoothie.png`,
    '/images/recipe-catalog/../0001-banana-oats-smoothie.png',
    '/images/recipe-catalog/%2e%2e/0001-banana-oats-smoothie.png',
  ]) {
    assert.equal(normalizeRecipeImageUrl(original), original);
    assert.equal(isKnownRecipeCatalogImageUrl(original), false);
  }
});

test('the complete client catalog references converted assets without losing any recipe mapping', () => {
  assert.equal(Object.keys(GENERATED_RECIPE_IMAGES).length, 878);
  const paths = Object.values(GENERATED_RECIPE_IMAGES);
  assert.equal(new Set(paths).size, 878);
  for (const path of paths) {
    assert.equal(isKnownRecipeCatalogImageUrl(path), true, path);
    assert.match(path, /\.webp$/);
  }
});

test('shared catalog, copied recipes, and meal-specific titles retain their exact images', () => {
  assert.equal(recipeImageUrl({ title: 'Banana Oats Smoothie', visibility: 'shared', imageUrl: png }), webp);
  assert.equal(recipeImageUrl({ title: 'Copy of Banana Oats Smoothie', visibility: 'company', imageUrl: png }), webp);
  assert.equal(recipeImageUrl({ title: 'My customized banana smoothie', visibility: 'shared', imageUrl: png }), webp);
  assert.equal(recipeImageUrl({ title: 'Banana Oats Smoothie', visibility: 'shared' }), webp);
});

test('custom remote photos and private uploads keep their existing paths', () => {
  for (const imageUrl of ['https://example.com/custom.png', 'private-upload.png', '/images/recipe-catalog/unknown.png']) {
    assert.equal(recipeImageUrl({ title: 'Custom recipe', visibility: 'company', imageUrl }), imageUrl);
    assert.equal(recipeImageUrl({ title: 'Custom recipe', visibility: 'shared', imageUrl }), imageUrl);
  }
  assert.equal(recipeImageUrl(null), '');
});
