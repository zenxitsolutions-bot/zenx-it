import { pool, withTransaction } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';

const RECIPE_COLUMNS = {
  title: 'title',
  emoji: 'emoji',
  mealType: 'meal_type',
  prepTime: 'prep_time',
  kcal: 'kcal',
  protein: 'protein',
  ingredients: 'ingredients',
  instructions: 'instructions',
};

// Exported so Plan.js can build the same recipe shape for populated meals.recipe.
export function mapRecipeRow(row, tags = []) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    mealType: row.meal_type,
    prepTime: row.prep_time,
    tags,
    kcal: row.kcal,
    protein: row.protein,
    ingredients: row.ingredients,
    instructions: row.instructions,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Exported so Plan.js can batch-fetch tags for populated recipes in one query.
export async function tagsByRecipeIds(recipeIds) {
  if (recipeIds.length === 0) return new Map();
  const [rows] = await pool.query(
    `SELECT recipe_id, tag FROM recipe_tags WHERE recipe_id IN (${recipeIds.map(() => '?').join(',')})`,
    recipeIds
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.recipe_id)) map.set(row.recipe_id, []);
    map.get(row.recipe_id).push(row.tag);
  }
  return map;
}

// filter: { companyId, mealType?, search? } — companyId required (no direct company_id column on
// recipes; scoped via the creating user's own company, same transitive-scoping design used
// throughout).
export async function listRecipes(filter = {}) {
  if (!filter.companyId) throw new Error('listRecipes: companyId is required');
  const where = ['u.company_id = ?'];
  const params = [filter.companyId];
  if (filter.mealType) {
    where.push('r.meal_type = ?');
    params.push(filter.mealType);
  }
  if (filter.search) {
    where.push('r.title LIKE ?');
    params.push(`%${filter.search}%`);
  }
  const [rows] = await pool.query(
    `SELECT r.* FROM recipes r JOIN users u ON u.id = r.created_by WHERE ${where.join(' AND ')} ORDER BY r.created_at DESC`,
    params
  );
  const tagsByRecipe = await tagsByRecipeIds(rows.map((r) => r.id));
  return rows.map((row) => mapRecipeRow(row, tagsByRecipe.get(row.id) ?? []));
}

// Used only by seed.js to check whether the demo recipes already exist.
export async function findRecipesByTitles(titles) {
  if (titles.length === 0) return [];
  const [rows] = await pool.query(
    `SELECT * FROM recipes WHERE title IN (${titles.map(() => '?').join(',')})`,
    titles
  );
  const tagsByRecipe = await tagsByRecipeIds(rows.map((r) => r.id));
  return rows.map((row) => mapRecipeRow(row, tagsByRecipe.get(row.id) ?? []));
}

export async function findRecipeById(id) {
  const [rows] = await pool.query('SELECT * FROM recipes WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) return null;
  const [tagRows] = await pool.query('SELECT tag FROM recipe_tags WHERE recipe_id = ?', [id]);
  return mapRecipeRow(rows[0], tagRows.map((r) => r.tag));
}

export async function createRecipe({ tags = [], createdBy, ...fields }) {
  const id = newId();
  await withTransaction(async (conn) => {
    const columns = ['id', 'created_by'];
    const values = [id, createdBy];
    for (const [key, column] of Object.entries(RECIPE_COLUMNS)) {
      if (fields[key] !== undefined) {
        columns.push(column);
        values.push(fields[key]);
      }
    }
    const placeholders = columns.map(() => '?').join(', ');
    await conn.query(`INSERT INTO recipes (${columns.join(', ')}) VALUES (${placeholders})`, values);
    if (tags.length) {
      await conn.query(
        `INSERT INTO recipe_tags (recipe_id, tag) VALUES ${tags.map(() => '(?, ?)').join(', ')}`,
        tags.flatMap((tag) => [id, tag])
      );
    }
  });
  return findRecipeById(id);
}

export async function updateRecipeById(id, patch) {
  const existing = await findRecipeById(id);
  if (!existing) return null;

  await withTransaction(async (conn) => {
    const { sets, params } = buildSetClause(RECIPE_COLUMNS, patch);
    if (sets.length) {
      await conn.query(`UPDATE recipes SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
    }
    if (patch.tags !== undefined) {
      await conn.query('DELETE FROM recipe_tags WHERE recipe_id = ?', [id]);
      if (patch.tags.length) {
        await conn.query(
          `INSERT INTO recipe_tags (recipe_id, tag) VALUES ${patch.tags.map(() => '(?, ?)').join(', ')}`,
          patch.tags.flatMap((tag) => [id, tag])
        );
      }
    }
  });
  return findRecipeById(id);
}

export async function deleteRecipeById(id) {
  const existing = await findRecipeById(id);
  if (!existing) return null;
  await pool.query('DELETE FROM recipes WHERE id = ?', [id]);
  return existing;
}
