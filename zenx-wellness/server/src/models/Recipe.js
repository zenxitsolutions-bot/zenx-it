import { pool, withTransaction } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';

const RECIPE_COLUMNS = {
  title: 'title',
  emoji: 'emoji',
  mealType: 'meal_type',
  prepTime: 'prep_time',
  cookTime: 'cook_time',
  totalTime: 'total_time',
  cuisine: 'cuisine',
  dietType: 'diet_type',
  servings: 'servings',
  kcal: 'kcal',
  protein: 'protein',
  carbs: 'carbs',
  fat: 'fat',
  fiber: 'fiber',
  sugar: 'sugar',
  portionSize: 'portion_size',
  allergens: 'allergens',
  suitableMealType: 'suitable_meal_type',
  imageUrl: 'image_url',
  healthNotes: 'health_notes',
  ingredients: 'ingredients',
  instructions: 'instructions',
  visibility: 'visibility',
};

function num(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function mapRecipeRow(row, tags = [], favorited = false) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    mealType: row.meal_type,
    prepTime: row.prep_time,
    cookTime: row.cook_time,
    totalTime: row.total_time,
    cuisine: row.cuisine ?? 'Indian',
    dietType: row.diet_type ?? 'Vegetarian',
    servings: num(row.servings) ?? 1,
    tags,
    kcal: row.kcal,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber,
    sugar: row.sugar,
    portionSize: row.portion_size,
    allergens: row.allergens,
    suitableMealType: row.suitable_meal_type,
    imageUrl: row.image_url,
    healthNotes: row.health_notes,
    ingredients: row.ingredients,
    instructions: row.instructions,
    visibility: row.visibility ?? 'company',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    favorited: Boolean(favorited || row.favorited),
  };
}

const IN_CHUNK = 200;

async function queryInChunks(ids, sqlForChunk) {
  const rows = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    const [part] = await pool.query(sqlForChunk(chunk), chunk);
    rows.push(...part);
  }
  return rows;
}

export async function tagsByRecipeIds(recipeIds) {
  if (recipeIds.length === 0) return new Map();
  const rows = await queryInChunks(
    recipeIds,
    (chunk) => `SELECT recipe_id, tag FROM recipe_tags WHERE recipe_id IN (${chunk.map(() => '?').join(',')})`
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.recipe_id)) map.set(row.recipe_id, []);
    map.get(row.recipe_id).push(row.tag);
  }
  return map;
}

export async function listRecipes(filter = {}) {
  if (!filter.companyId) throw new Error('listRecipes: companyId is required');
  // Shared catalog (Healthy Indian recipes) is visible to every ACTIVE ZenX customer.
  // Custom recipes stay on the creator's company. The caller is already gated to an
  // ACTIVE company in authenticate middleware.
  const where = ['(r.visibility = ? OR u.company_id = ?)'];
  const params = ['shared', filter.companyId];
  if (filter.mealType) {
    where.push('r.meal_type = ?');
    params.push(filter.mealType);
  }
  if (filter.dietType === 'Vegetarian') {
    where.push("r.diet_type IN ('Vegetarian', 'Vegan')");
  } else if (filter.dietType) {
    where.push('r.diet_type = ?');
    params.push(filter.dietType);
  }
  if (filter.search) {
    where.push('(r.title LIKE ? OR r.ingredients LIKE ?)');
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }
  if (filter.tag) {
    where.push('EXISTS (SELECT 1 FROM recipe_tags t WHERE t.recipe_id = r.id AND t.tag = ?)');
    params.push(filter.tag);
  }
  if (filter.maxKcal) {
    where.push('r.kcal IS NOT NULL AND r.kcal <= ?');
    params.push(Number(filter.maxKcal));
  }
  if (filter.minProtein) {
    where.push('r.protein IS NOT NULL AND r.protein >= ?');
    params.push(Number(filter.minProtein));
  }
  if (filter.favorite && filter.userId) {
    where.push('EXISTS (SELECT 1 FROM recipe_favorites f WHERE f.recipe_id = r.id AND f.user_id = ?)');
    params.push(filter.userId);
  }

  const favoriteSelect = filter.userId
    ? ', EXISTS (SELECT 1 FROM recipe_favorites f WHERE f.recipe_id = r.id AND f.user_id = ?) AS favorited'
    : ', 0 AS favorited';
  const selectParams = filter.userId ? [filter.userId, ...params] : params;

  const [rows] = await pool.query(
    `SELECT r.*${favoriteSelect}
     FROM recipes r
     LEFT JOIN users u ON u.id = r.created_by
     WHERE ${where.join(' AND ')}
     ORDER BY r.title ASC`,
    selectParams
  );
  const tagsByRecipe = await tagsByRecipeIds(rows.map((r) => r.id));
  return rows.map((row) => mapRecipeRow(row, tagsByRecipe.get(row.id) ?? [], row.favorited));
}

export async function findRecipesByTitles(titles) {
  if (titles.length === 0) return [];
  const rows = await queryInChunks(
    titles,
    (chunk) => `SELECT * FROM recipes WHERE title IN (${chunk.map(() => '?').join(',')})`
  );
  const tagsByRecipe = await tagsByRecipeIds(rows.map((r) => r.id));
  return rows.map((row) => mapRecipeRow(row, tagsByRecipe.get(row.id) ?? []));
}

export async function findRecipeById(id, userId = null) {
  const [rows] = await pool.query('SELECT * FROM recipes WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) return null;
  const [tagRows] = await pool.query('SELECT tag FROM recipe_tags WHERE recipe_id = ?', [id]);
  let favorited = false;
  if (userId) {
    const [fav] = await pool.query(
      'SELECT 1 FROM recipe_favorites WHERE user_id = ? AND recipe_id = ? LIMIT 1',
      [userId, id]
    );
    favorited = fav.length > 0;
  }
  return mapRecipeRow(rows[0], tagRows.map((r) => r.tag), favorited);
}

export async function createRecipe({ tags = [], createdBy, ...fields }, options = {}) {
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
  if (options.returning === false) return { id };
  return findRecipeById(id);
}

export async function updateRecipeById(id, patch, options = {}) {
  const existing = options.returning === false ? { id } : await findRecipeById(id);
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
  if (options.returning === false) return existing;
  return findRecipeById(id);
}

export async function deleteRecipeById(id) {
  const existing = await findRecipeById(id);
  if (!existing) return null;
  await pool.query('DELETE FROM recipes WHERE id = ?', [id]);
  return existing;
}

export async function duplicateRecipe(id, createdBy) {
  const existing = await findRecipeById(id);
  if (!existing) return null;
  const { id: _id, createdBy: _by, createdAt: _c, updatedAt: _u, favorited: _f, ...fields } = existing;
  return createRecipe({
    ...fields,
    title: existing.title.startsWith('Copy of ') ? existing.title : `Copy of ${existing.title}`,
    visibility: 'company',
    createdBy,
  });
}

export async function syncCatalogRecipes(recipes, createdBy) {
  let created = 0;
  let updated = 0;
  const existing = await findRecipesByTitles(recipes.map((recipe) => recipe.title));
  const byTitle = new Map();
  for (const row of existing) {
    const list = byTitle.get(row.title) ?? [];
    list.push(row);
    byTitle.set(row.title, list);
  }
  for (const recipe of recipes) {
    const rows = byTitle.get(recipe.title) ?? [];
    if (rows.length === 0) {
      await createRecipe({ ...recipe, createdBy, visibility: 'shared' }, { returning: false });
      created += 1;
      continue;
    }
    for (const row of rows) {
      const { title: _title, ...fields } = recipe;
      await updateRecipeById(row.id, { ...fields, visibility: 'shared' }, { returning: false });
      updated += 1;
    }
  }
  return { created, updated };
}

export async function markRecipesSharedByTitles(titles) {
  if (titles.length === 0) return 0;
  let affected = 0;
  for (let i = 0; i < titles.length; i += IN_CHUNK) {
    const chunk = titles.slice(i, i + IN_CHUNK);
    const [result] = await pool.query(
      `UPDATE recipes SET visibility = 'shared' WHERE title IN (${chunk.map(() => '?').join(',')})`,
      chunk
    );
    affected += result.affectedRows;
  }
  return affected;
}

export async function setRecipeFavorite(userId, recipeId, favored) {
  if (favored) {
    await pool.query(
      'INSERT IGNORE INTO recipe_favorites (user_id, recipe_id) VALUES (?, ?)',
      [userId, recipeId]
    );
  } else {
    await pool.query('DELETE FROM recipe_favorites WHERE user_id = ? AND recipe_id = ?', [userId, recipeId]);
  }
  return findRecipeById(recipeId, userId);
}
