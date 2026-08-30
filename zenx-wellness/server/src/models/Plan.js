import { pool, withTransaction } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';
import { mapRecipeRow, tagsByRecipeIds } from './Recipe.js';
import { toClientShape } from '../utils/serialize.js';

const PLAN_COLUMNS = { title: 'title', published: 'published' };

function mapPlan(row) {
  return {
    id: row.id,
    client: row.client_id,
    dietitian: row.dietitian_id,
    title: row.title,
    week: row.week,
    weekEnd: row.week_end,
    published: !!row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMeal(row, recipe) {
  return {
    day: row.day,
    time: row.time,
    mealType: row.meal_type,
    recipe,
    customTitle: row.custom_title,
    completed: !!row.completed,
    swapRequested: !!row.swap_requested,
    notes: row.notes,
  };
}

// "populate('meals.recipe')" for one or many plans at once — one join query for the meals,
// one batched query for recipe tags, grouped in JS. Avoids N+1 queries per plan.
async function getMealsForPlans(planIds) {
  if (planIds.length === 0) return new Map();
  const [rows] = await pool.query(
    `SELECT pm.*,
       r.id AS r_id, r.title AS r_title, r.emoji AS r_emoji, r.meal_type AS r_meal_type,
       r.prep_time AS r_prep_time, r.kcal AS r_kcal, r.protein AS r_protein,
       r.ingredients AS r_ingredients, r.instructions AS r_instructions,
       r.created_by AS r_created_by, r.created_at AS r_created_at, r.updated_at AS r_updated_at
     FROM plan_meals pm
     LEFT JOIN recipes r ON r.id = pm.recipe_id
     WHERE pm.plan_id IN (${planIds.map(() => '?').join(',')})
     ORDER BY pm.plan_id, pm.idx`,
    planIds
  );

  const recipeIds = [...new Set(rows.filter((r) => r.recipe_id).map((r) => r.recipe_id))];
  const tagsByRecipe = await tagsByRecipeIds(recipeIds);

  const mealsByPlan = new Map();
  for (const row of rows) {
    // toClientShape here because this recipe is nested inside a meal — it never separately
    // passes through a controller's own toClientShape call the way a top-level recipe would.
    const recipe = row.recipe_id
      ? toClientShape(
          mapRecipeRow(
            {
              id: row.r_id,
              title: row.r_title,
              emoji: row.r_emoji,
              meal_type: row.r_meal_type,
              prep_time: row.r_prep_time,
              kcal: row.r_kcal,
              protein: row.r_protein,
              ingredients: row.r_ingredients,
              instructions: row.r_instructions,
              created_by: row.r_created_by,
              created_at: row.r_created_at,
              updated_at: row.r_updated_at,
            },
            tagsByRecipe.get(row.recipe_id) ?? []
          )
        )
      : null;
    if (!mealsByPlan.has(row.plan_id)) mealsByPlan.set(row.plan_id, []);
    mealsByPlan.get(row.plan_id).push(mapMeal(row, recipe));
  }
  return mealsByPlan;
}

// filter: { companyId, client?, dietitian?, week? } — companyId required (no direct company_id
// column on plans; scoped via the owning dietitian's own company — client and dietitian are
// always same-company by construction, see plan.controller.js#createPlan's validation).
export async function listPlans(filter = {}) {
  if (!filter.companyId) throw new Error('listPlans: companyId is required');
  const where = ['du.company_id = ?'];
  const params = [filter.companyId];
  if (filter.client) {
    where.push('p.client_id = ?');
    params.push(filter.client);
  }
  if (filter.dietitian) {
    where.push('p.dietitian_id = ?');
    params.push(filter.dietitian);
  }
  if (filter.week) {
    where.push('p.week = ?');
    params.push(filter.week);
  }
  const [rows] = await pool.query(
    `SELECT p.* FROM plans p JOIN users du ON du.id = p.dietitian_id WHERE ${where.join(' AND ')} ORDER BY p.week DESC`,
    params
  );
  const mealsByPlan = await getMealsForPlans(rows.map((r) => r.id));
  return rows.map((row) => ({ ...mapPlan(row), meals: mealsByPlan.get(row.id) ?? [] }));
}

// Used only by seed.js to check whether a demo plan already exists for the seed client.
export async function findPlanByClient(clientId) {
  const [rows] = await pool.query('SELECT id FROM plans WHERE client_id = ? LIMIT 1', [clientId]);
  return rows[0] ? findPlanById(rows[0].id) : null;
}

export async function findPlanById(id) {
  const [rows] = await pool.query('SELECT * FROM plans WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) return null;
  const mealsByPlan = await getMealsForPlans([id]);
  return { ...mapPlan(rows[0]), meals: mealsByPlan.get(id) ?? [] };
}

async function insertMeals(conn, planId, meals) {
  if (!meals.length) return;
  const values = [];
  meals.forEach((meal, idx) => {
    values.push(
      planId,
      idx,
      meal.day,
      meal.time,
      meal.mealType,
      meal.recipe ?? null,
      meal.customTitle ?? null,
      meal.completed ?? false,
      meal.swapRequested ?? false,
      meal.notes ?? null
    );
  });
  const placeholders = meals.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  await conn.query(
    `INSERT INTO plan_meals (plan_id, idx, day, time, meal_type, recipe_id, custom_title, completed, swap_requested, notes) VALUES ${placeholders}`,
    values
  );
}

export async function createPlan({ client, dietitian, title, week, weekEnd, meals = [], published }) {
  const id = newId();
  await withTransaction(async (conn) => {
    await conn.query(
      'INSERT INTO plans (id, client_id, dietitian_id, title, week, week_end, published) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, client, dietitian, title ?? 'Weekly nourish plan', week, weekEnd, published ?? false]
    );
    await insertMeals(conn, id, meals);
  });
  return findPlanById(id);
}

export async function updatePlanById(id, patch) {
  const existing = await findPlanById(id);
  if (!existing) return null;

  await withTransaction(async (conn) => {
    const { sets, params } = buildSetClause(PLAN_COLUMNS, patch);
    if (sets.length) {
      await conn.query(`UPDATE plans SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
    }
    if (patch.meals !== undefined) {
      await conn.query('DELETE FROM plan_meals WHERE plan_id = ?', [id]);
      await insertMeals(conn, id, patch.meals);
    }
  });
  return findPlanById(id);
}

export async function deletePlanById(id) {
  const existing = await findPlanById(id);
  if (!existing) return null;
  await pool.query('DELETE FROM plans WHERE id = ?', [id]);
  return existing;
}

// Updates one meal by its position within the plan — mirrors the client's
// plan.meals.indexOf(meal) addressing (client/src/components/portal/client/MealsScreen.jsx).
// Returns null if the plan or that index doesn't exist.
export async function updatePlanMealByIndex(planId, index, patch) {
  const [rows] = await pool.query('SELECT id FROM plan_meals WHERE plan_id = ? ORDER BY idx', [planId]);
  const target = rows[index];
  if (!target) return null;

  const { sets, params } = buildSetClause({ completed: 'completed', swapRequested: 'swap_requested' }, patch);
  if (sets.length) {
    await pool.query(`UPDATE plan_meals SET ${sets.join(', ')} WHERE id = ?`, [...params, target.id]);
  }
  return findPlanById(planId);
}
