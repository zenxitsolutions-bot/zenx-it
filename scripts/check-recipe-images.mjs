import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { HEALTHY_INDIAN_RECIPES } from '../zenx-wellness/server/src/data/healthyIndianRecipes.js';
import { GENERATED_RECIPE_IMAGES as server } from '../zenx-wellness/server/src/data/generatedRecipeImages.js';
import { GENERATED_RECIPE_IMAGES as client } from '../zenx-wellness/client/src/lib/generatedRecipeImages.js';

assert.deepEqual(client, server, 'Client and server image registries differ');
const titles = new Set(HEALTHY_INDIAN_RECIPES.map(r => r.title));
const hashes = new Set();
const urls = new Set();
for (const [title, url] of Object.entries(server)) {
  assert.ok(titles.has(title), `Unknown recipe: ${title}`);
  assert.match(url, /^\/images\/recipe-catalog\/\d{4}-[a-z0-9-]+\.png$/);
  assert.ok(!urls.has(url), `Reused image URL: ${title}`);
  urls.add(url);
  const file = new URL('../zenx-wellness/client/public' + url, import.meta.url);
  assert.ok(existsSync(file), `Missing image for ${title}`);
  const bytes = readFileSync(file);
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG', `Invalid PNG: ${title}`);
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.ok(!hashes.has(hash), `Identical image bytes reused for ${title}`);
  hashes.add(hash);
}
const pending = HEALTHY_INDIAN_RECIPES.filter(r => !server[r.title]);
console.log(JSON.stringify({ total: titles.size, completed: urls.size, pending: pending.length, next: pending[0]?.title ?? null }, null, 2));
if (process.argv.includes('--complete')) {
  assert.equal(pending.length, 0, 'Individual image generation is unfinished');
}
