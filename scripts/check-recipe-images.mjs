import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { HEALTHY_INDIAN_RECIPES } from '../zenx-wellness/server/src/data/healthyIndianRecipes.js';
import { GENERATED_RECIPE_IMAGES as server } from '../zenx-wellness/server/src/data/generatedRecipeImages.js';
import { GENERATED_RECIPE_IMAGES as client } from '../zenx-wellness/client/src/lib/generatedRecipeImages.js';
import sharp from 'sharp';
import { CONVERTED_RECIPE_IMAGE_BASENAMES } from '../zenx-wellness/shared/recipeImageAssets.js';

assert.deepEqual(client, server, 'Client and server image registries differ');
const titles = new Set(HEALTHY_INDIAN_RECIPES.map(r => r.title));
const hashes = new Set();
const urls = new Set();
const convertedNames = new Set(CONVERTED_RECIPE_IMAGE_BASENAMES);
assert.equal(convertedNames.size, CONVERTED_RECIPE_IMAGE_BASENAMES.length, 'Duplicate manifest entries');
for (const [title, url] of Object.entries(server)) {
  assert.ok(titles.has(title), `Unknown recipe: ${title}`);
  assert.match(url, /^\/images\/recipe-catalog\/\d{4}-[a-z0-9-]+\.webp$/);
  assert.ok(convertedNames.has(url.split('/').at(-1).replace(/\.webp$/, '')), `Missing legacy redirect: ${title}`);
  assert.ok(!urls.has(url), `Reused image URL: ${title}`);
  urls.add(url);
  const file = new URL('../zenx-wellness/client/public' + url, import.meta.url);
  assert.ok(existsSync(file), `Missing image for ${title}`);
  const bytes = readFileSync(file);
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', `Invalid WebP: ${title}`);
  assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', `Invalid WebP: ${title}`);
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1254, `Image resolution changed: ${title}`);
  assert.equal(metadata.height, 1254, `Image resolution changed: ${title}`);
  await sharp(bytes).raw().toBuffer(); // Decode the complete image, not just its header.
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.ok(!hashes.has(hash), `Identical image bytes reused for ${title}`);
  hashes.add(hash);
}
for (const basename of CONVERTED_RECIPE_IMAGE_BASENAMES) {
  const relative = '../zenx-wellness/client/public/images/recipe-catalog/' + basename;
  assert.ok(existsSync(new URL(relative + '.webp', import.meta.url)), `Missing converted asset: ${basename}`);
  assert.ok(!existsSync(new URL(relative + '.png', import.meta.url)), `Duplicate original remains in deployment: ${basename}`);
}
const pending = HEALTHY_INDIAN_RECIPES.filter(r => !server[r.title]);
console.log(JSON.stringify({ total: titles.size, completed: urls.size, pending: pending.length, next: pending[0]?.title ?? null }, null, 2));
if (process.argv.includes('--complete')) {
  assert.equal(pending.length, 0, 'Individual image generation is unfinished');
}
