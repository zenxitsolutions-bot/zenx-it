import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../../src/db/pool.js';
import { env } from '../../src/config/env.js';
import { mapRecipeRow } from '../../src/models/Recipe.js';
import { findPlanById } from '../../src/models/Plan.js';
import { getRecipeImage } from '../../src/controllers/recipe.controller.js';
import { uploadsDir } from '../../src/middleware/upload.js';

const png = '/images/recipe-catalog/0001-banana-oats-smoothie.png';
const webp = '/images/recipe-catalog/0001-banana-oats-smoothie.webp';

test('recipe API serialization normalizes old catalog URLs regardless of visibility without mutating stored rows', () => {
  for (const visibility of ['shared', 'company']) {
    const row = { id: 'r1', title: 'Copy of Banana Oats Smoothie', image_url: png, visibility };
    assert.equal(mapRecipeRow(row).imageUrl, webp);
    assert.equal(row.image_url, png);
  }
  for (const image_url of [null, 'private-upload.png', '/images/recipe-catalog/unknown.png', `https://example.com${png}`]) {
    assert.equal(mapRecipeRow({ id: 'r1', image_url }).imageUrl, image_url);
  }
});

test('nested plan recipes normalize legacy photos and keep them with meal-specific title overrides', async (t) => {
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM plans p')) return [[{ id: 'p1', week: '2026-09-21' }]];
    if (sql.includes('FROM plan_meals pm')) return [[{
      plan_id: 'p1', recipe_id: 'r1', r_id: 'r1', r_title: 'Banana Oats Smoothie',
      r_image_url: png, recipe_override: JSON.stringify({ title: 'My customized smoothie' }),
    }]];
    if (sql.includes('FROM recipe_tags')) return [[]];
    throw new Error(`Unexpected database query: ${sql}`);
  });
  const plan = await findPlanById('p1');
  assert.equal(plan.meals[0].recipe.imageUrl, webp);
  assert.equal(plan.meals[0].recipe.title, 'My customized smoothie');
});

test('image endpoint redirects catalog assets to the configured frontend, keeps upload behavior and enforces tenant scope', async (t) => {
  let row = { id: 'r1', title: 'Smoothie', image_url: png, visibility: 'shared', created_by: 'owner' };
  let ownerCompany = 'company-a';
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM recipes WHERE id')) return [[row]];
    if (sql.includes('FROM recipe_tags')) return [[]];
    if (sql.includes('FROM users u')) return [[{ id: 'owner', role: 'dietitian', company_id: ownerCompany }]];
    throw new Error(`Unexpected database query: ${sql}`);
  });
  const fileChecks = [];
  t.mock.method(fs, 'existsSync', (filename) => {
    fileChecks.push(filename);
    return filename === path.join(uploadsDir, 'private-upload.webp');
  });
  async function request() {
    const result = { headers: {} };
    await getRecipeImage(
      { params: { id: 'r1' }, user: { id: 'viewer', companyId: 'company-a', role: 'dietitian' } },
      {
        redirect(url) { result.redirect = url; },
        setHeader(key, value) { result.headers[key] = value; },
        sendFile(filename) { result.filename = filename; },
      },
      (error) => { result.error = error; },
    );
    return result;
  }

  for (const image_url of [png, webp, `${png}?v=2#photo`]) {
    row = { ...row, image_url };
    const response = await request();
    assert.equal(response.error, undefined);
    assert.equal(response.redirect, new URL(image_url.replace('.png', '.webp'), env.clientOrigin).href);
  }
  assert.equal(fileChecks.length, 0, 'catalog requests do not search private uploads');

  row = { ...row, visibility: 'company', image_url: png };
  assert.equal((await request()).redirect, new URL(webp, env.clientOrigin).href);
  ownerCompany = 'other-company';
  const denied = await request();
  assert.equal(denied.error.status, 404);
  assert.equal(denied.redirect, undefined);
  ownerCompany = 'company-a';

  row = { ...row, image_url: 'private-upload.webp' };
  const upload = await request();
  assert.equal(upload.filename, path.join(uploadsDir, 'private-upload.webp'));
  assert.equal(upload.headers['Content-Type'], 'image/webp');
  assert.equal(upload.headers['Cache-Control'], 'private, no-store');

  row = { ...row, image_url: 'https://example.com/custom.png' };
  assert.equal((await request()).redirect, row.image_url);
  row = { ...row, image_url: '/images/recipe-catalog/unknown.png' };
  const unknown = await request();
  assert.equal(unknown.error.status, 404);
  assert.equal(unknown.redirect, undefined);
});
