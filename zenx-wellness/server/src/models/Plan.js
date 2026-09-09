import { pool, withTransaction } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';
import { mapRecipeRow, tagsByRecipeIds } from './Recipe.js';
import { toClientShape } from '../utils/serialize.js';
import { dateForWeekdaySlot } from '../utils/calendarDate.js';
import { mergeRecipeWithOverride, parseRecipeOverride } from '../lib/planMealRecipe.js';

const PLAN_COLUMNS = {
  title: 'title',
  published: 'published',
  reusable: 'reusable',
  client: 'client_id',
  week: 'week',
  weekEnd: 'week_end',
};

// DATE_FORMAT keeps week/week_end as the stored civil day. Returning the raw DATE column lets
// mysql2 wrap it in a UTC Date; JSON then becomes an ISO timestamp the client's local timezone
// can shift (Thursday 3 Sep → another weekday). Same reason Progress.js formats dates in SQL.
const PLAN_DATE_COLUMNS = `DATE_FORMAT(p.week, '%Y-%m-%d') AS week, DATE_FORMAT(p.week_end, '%Y-%m-%d') AS week_end`;
const PLAN_SELECT = `SELECT p.id, p.client_id, p.dietitian_id, p.title, ${PLAN_DATE_COLUMNS}, p.published, p.reusable, p.created_at, p.updated_at FROM plans p`;

function mapPlan(row) {
  return {
    id: row.id,
    client: row.client_id,
    dietitian: row.dietitian_id,
    title: row.title,
    week: row.week,
    weekEnd: row.week_end,
    published: !!row.published,
    reusable: !!row.reusable,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMeal(row, recipe) {
  const recipeOverride = parseRecipeOverride(row.recipe_override);
  return {
    day: row.day,
    time: row.time,
    mealType: row.meal_type,
    recipe: mergeRecipeWithOverride(recipe, recipeOverride),
    customTitle: row.custom_title,
    completed: !!row.completed,
    swapRequested: !!row.swap_requested,
    notes: row.notes,
    servings: row.meal_servings != null ? Number(row.meal_servings) : 1,
    recipeOverride,
  };
}

// "populate('meals.recipe')" for one or many plans at once — one join query for the meals,
// one batched query for recipe tags, grouped in JS. Avoids N+1 queries per plan.
async function getMealsForPlans(planIds) {
  if (planIds.length === 0) return new Map();
  const [rows] = await pool.query(
    `SELECT pm.*, pm.servings AS meal_servings,
       r.id AS r_id, r.title AS r_title, r.emoji AS r_emoji, r.meal_type AS r_meal_type,
       r.prep_time AS r_prep_time, r.cook_time AS r_cook_time, r.total_time AS r_total_time,
       r.cuisine AS r_cuisine, r.diet_type AS r_diet_type, r.servings AS r_servings,
       r.kcal AS r_kcal, r.protein AS r_protein, r.carbs AS r_carbs, r.fat AS r_fat,
       r.fiber AS r_fiber, r.sugar AS r_sugar, r.portion_size AS r_portion_size,
       r.allergens AS r_allergens, r.suitable_meal_type AS r_suitable_meal_type,
       r.image_url AS r_image_url, r.health_notes AS r_health_notes,
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
              cook_time: row.r_cook_time,
              total_time: row.r_total_time,
              cuisine: row.r_cuisine,
              diet_type: row.r_diet_type,
              servings: row.r_servings,
              kcal: row.r_kcal,
              protein: row.r_protein,
              carbs: row.r_carbs,
              fat: row.r_fat,
              fiber: row.r_fiber,
              sugar: row.r_sugar,
              portion_size: row.r_portion_size,
              allergens: row.r_allergens,
              suitable_meal_type: row.r_suitable_meal_type,
              image_url: row.r_image_url,
              health_notes: row.r_health_notes,
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
  if (filter.published === true) {
    where.push('p.published = 1');
  }
  if (filter.reusable === true) {
    where.push('p.reusable = 1');
  }
  const [rows] = await pool.query(
    `${PLAN_SELECT} JOIN users du ON du.id = p.dietitian_id WHERE ${where.join(' AND ')} ORDER BY p.week DESC, p.updated_at DESC`,
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
  const [rows] = await pool.query(`${PLAN_SELECT} WHERE p.id = ? LIMIT 1`, [id]);
  if (!rows[0]) return null;
  const mealsByPlan = await getMealsForPlans([id]);
  return { ...mapPlan(rows[0]), meals: mealsByPlan.get(id) ?? [] };
}

async function insertMeals(conn, planId, meals) {
  if (!meals.length) return;
  const values = [];
  meals.forEach((meal, idx) => {
    const override = parseRecipeOverride(meal.recipeOverride);
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
      meal.notes ?? null,
      meal.servings ?? 1,
      override ? JSON.stringify(override) : null
    );
  });
  const placeholders = meals.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  await conn.query(
    `INSERT INTO plan_meals (plan_id, idx, day, time, meal_type, recipe_id, custom_title, completed, swap_requested, notes, servings, recipe_override) VALUES ${placeholders}`,
    values
  );
}

export async function createPlan({ client, dietitian, title, week, weekEnd, meals = [], published, reusable }) {
  const id = newId();
  await withTransaction(async (conn) => {
    await conn.query(
      'INSERT INTO plans (id, client_id, dietitian_id, title, week, week_end, published, reusable) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, client, dietitian, title ?? 'Weekly nourish plan', week, weekEnd, published ?? false, reusable ?? false]
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

// { active, completed, draft } for one dietitian's plans — the overview's Plans breakdown.
// There is no status column on `plans` (see schema.sql): a plan's state is derived from
// `published` plus whether its week has finished, so these three buckets are exhaustive and
// mutually exclusive by construction. `today` is passed in (not CURDATE()) so the caller's own
// day boundary decides, matching how the rest of insights.controller.js works.
export async function countPlanStatesForDietitian(dietitianId, today) {
  const [rows] = await pool.query(
    `SELECT
       SUM(published = 1 AND week_end >= ?) AS active,
       SUM(published = 1 AND week_end < ?) AS completed,
       SUM(published = 0) AS draft
     FROM plans WHERE dietitian_id = ?`,
    [today, today, dietitianId]
  );
  // SUM() over zero rows is NULL, not 0.
  return {
    active: Number(rows[0].active ?? 0),
    completed: Number(rows[0].completed ?? 0),
    draft: Number(rows[0].draft ?? 0),
  };
}

// How many of a dietitian's plans were published in [from, to] — used twice per request (this
// window and the one before it) to derive a real change figure for the overview's stat cards.
export async function countPublishedPlansCreatedBetween(dietitianId, from, to) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM plans WHERE dietitian_id = ? AND published = 1 AND created_at >= ? AND created_at < ?',
    [dietitianId, from, to]
  );
  return Number(rows[0].count);
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

export async function clearResolvedSwapRequests({ clientId, plan, resolutions = [] }) {
  if (!clientId) return;
  const [rows] = await pool.query(
    `SELECT pm.id, pm.day, pm.time, DATE_FORMAT(p.week, '%Y-%m-%d') AS week
     FROM plan_meals pm
     JOIN plans p ON p.id = pm.plan_id
     WHERE p.client_id = ? AND pm.swap_requested = 1`,
    [clientId]
  );
  if (!rows.length) return;

  const resolved = new Set();
  for (const note of resolutions) {
    if (!note) continue;
    resolved.add(`${note.day}|${note.time}`);
    const date = dateForWeekdaySlot(plan?.week, note.day);
    if (date) resolved.add(`${date}|${note.time}`);
  }

  const ids = rows
    .filter((row) => {
      if (!resolved.size) return plan?.week && row.week === plan.week;
      const date = dateForWeekdaySlot(row.week, row.day);
      return resolved.has(`${row.day}|${row.time}`) || (date && resolved.has(`${date}|${row.time}`));
    })
    .map((row) => row.id);

  if (!ids.length) return;
  await pool.query(
    `UPDATE plan_meals SET swap_requested = 0 WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
}

export async function listSwapRequestsForDietitian(dietitianId) {
  const [rows] = await pool.query(
    `SELECT
       p.id AS plan_id,
       p.client_id,
       DATE_FORMAT(p.week, '%Y-%m-%d') AS week,
       u.name AS client_name,
       pm.day,
       pm.time,
       pm.meal_type,
       pm.custom_title,
       r.title AS recipe_title
     FROM plan_meals pm
     JOIN plans p ON p.id = pm.plan_id
     JOIN users u ON u.id = p.client_id
     LEFT JOIN recipes r ON r.id = pm.recipe_id
     WHERE p.dietitian_id = ? AND pm.swap_requested = 1
     ORDER BY p.week DESC, pm.idx`,
    [dietitianId]
  );
  return rows.map((row) => ({
    planId: row.plan_id,
    clientId: row.client_id,
    clientName: row.client_name,
    week: row.week,
    day: row.day,
    time: row.time,
    mealType: row.meal_type,
    mealTitle: row.recipe_title || row.custom_title || row.meal_type,
    mealDate: dateForWeekdaySlot(row.week, row.day),
  }));
}
