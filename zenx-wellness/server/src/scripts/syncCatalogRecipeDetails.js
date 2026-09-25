import { safeErrorMeta } from '../utils/safeError.js';

/**
 * Preview: node src/scripts/syncCatalogRecipeDetails.js
 * Apply:   node src/scripts/syncCatalogRecipeDetails.js --apply
 *
 * Deliberately narrower than catalog:sync: only editorial fields on shared
 * recipes whose exact title matches the canonical catalog. Older catalog rows
 * can still have legacy image URLs; this command leaves those URLs untouched.
 * Never changes company recipes, ownership, visibility, images or nutrition.
 */
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pool, withTransaction } from '../db/pool.js';
import { HEALTHY_INDIAN_RECIPES } from '../data/healthyIndianRecipes.js';

const fields = {
  ingredients: 'ingredients',
  instructions: 'instructions',
  portionSize: 'portion_size',
  prepTime: 'prep_time',
  cookTime: 'cook_time',
  totalTime: 'total_time',
};

const catalog = new Map(HEALTHY_INDIAN_RECIPES.map((recipe) => [recipe.title, recipe]));
const apply = process.argv.includes('--apply');

try {
  const outcome = await withTransaction(async (conn) => {
    const [rows] = await conn.query(
      `SELECT id, title, image_url, ${Object.values(fields).join(', ')}
       FROM recipes WHERE visibility = 'shared'${apply ? ' FOR UPDATE' : ''}`
    );
    const matching = rows.filter((row) => catalog.has(row.title));
    const duplicates = matching.length - new Set(matching.map((row) => row.title)).size;
    if (duplicates) throw new Error('Duplicate shared catalog titles found; refusing ambiguous updates.');
    if (apply && matching.length !== catalog.size) {
      throw new Error(`Expected ${catalog.size} shared catalog recipes but found ${matching.length}; review the preview before applying.`);
    }
    const changed = matching.filter((row) => Object.entries(fields).some(([key, column]) => catalog.get(row.title)[key] !== row[column]));
    if (!apply || !changed.length) return { mode: apply ? 'apply' : 'preview', matched: matching.length, changed: changed.length };

    const backupDir = await mkdtemp(join(tmpdir(), 'zenx-recipe-details-'));
    const backupPath = join(backupDir, 'before.json');
    await writeFile(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), rows: changed }, null, 2), { flag: 'wx' });

    for (const row of changed) {
      const recipe = catalog.get(row.title);
      const [result] = await conn.query(
        `UPDATE recipes SET ${Object.values(fields).map((column) => `${column} = ?`).join(', ')}
         WHERE id = ? AND visibility = 'shared' AND title = ? AND image_url <=> ?`,
        [...Object.keys(fields).map((key) => recipe[key]), row.id, row.title, row.image_url]
      );
      if (result.affectedRows !== 1) throw new Error('Catalog changed during sync; rolling back.');
    }
    return { mode: 'apply', matched: matching.length, updated: changed.length, backupPath };
  });
  console.log(JSON.stringify(outcome, null, 2));
} catch (error) {
  // Do not print connection URLs or credentials if the database rejects login.
  console.error('Recipe detail sync failed:', safeErrorMeta(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
