import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { pool } from '../../src/db/pool.js';
import { planRouter } from '../../src/routes/plan.routes.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { updatePlanMealByIndex } from '../../src/models/Plan.js';

// Real routes, authorization, validation and models; all database work is intercepted below.
// Fixture accounts deliberately have no email address, so no test can send a notification.
test('published diet plans can only be edited or deleted by their owner or company admin', async (t) => {
  const users = new Map([
    ['dietitian', { id: 'dietitian', role: 'dietitian', company_id: 'company-a', timezone: 'Asia/Kolkata' }],
    ['other-dietitian', { id: 'other-dietitian', role: 'dietitian', company_id: 'company-a' }],
    ['client', { id: 'client', role: 'client', company_id: 'company-a', timezone: 'America/Chicago' }],
    ['admin', { id: 'admin', role: 'admin', company_id: 'company-a' }],
    ['foreign-admin', { id: 'foreign-admin', role: 'admin', company_id: 'company-b' }],
    ['foreign-dietitian', { id: 'foreign-dietitian', role: 'dietitian', company_id: 'company-b' }],
  ]);
  const plans = new Map();
  for (const user of users.values()) user.password_hash = 'fixture-password-hash';
  const meals = new Map();
  const writes = [];
  const transactions = [];
  const userReads = [];
  const stateChecks = [];

  function seedPlan(id, dietitian = 'dietitian') {
    plans.set(id, {
      id, client_id: 'client', dietitian_id: dietitian, title: `Published ${id}`,
      week: '2026-09-21', week_end: '2026-09-27', published: true, reusable: false,
      created_at: new Date('2026-09-20T10:00:00Z'), updated_at: new Date('2026-09-20T10:00:00Z'),
    });
    meals.set(id, [{
      plan_id: id, idx: 0, day: 'Monday', time: '08:00 AM', meal_type: 'Breakfast',
      recipe_id: null, custom_title: 'Oats with fruit', completed: true,
      swap_requested: false, notes: 'One bowl', meal_servings: 1, recipe_override: null,
    }]);
  }
  for (const id of ['edit-owner', 'edit-admin', 'delete-owner', 'delete-admin', 'protected']) seedPlan(id);
  seedPlan('foreign-plan', 'foreign-dietitian');

  async function query(sql, params) {
    if (sql.includes('FROM auth_sessions')) return [[{ id: params[0] }]];
    if (sql.includes('FROM users u') && sql.includes('WHERE u.id = ?')) {
      userReads.push(params[0]);
      return [[users.get(params[0])].filter(Boolean)];
    }
    if (sql.includes('FROM companies WHERE id = ?')) return [[{ id: params[0], status: 'ACTIVE' }]];
    if (sql.includes('FROM plans p') && sql.includes('WHERE p.id = ?')) {
      return [[plans.get(params[0])].filter(Boolean)];
    }
    if (sql.includes('FROM plan_meals pm') && sql.includes('WHERE pm.plan_id IN')) {
      return [params.flatMap((id) => meals.get(id) ?? [])];
    }
    if (sql === 'SELECT day, time, completed, swap_requested FROM plan_meals WHERE plan_id = ? ORDER BY idx FOR UPDATE') {
      stateChecks.push(params[0]);
      assert.equal(transactions.at(-1), 'begin', 'snapshot check must run inside the write transaction');
      return [meals.get(params[0]) ?? []];
    }
    if (sql.startsWith('UPDATE plans SET ')) {
      writes.push({ sql, params });
      const plan = plans.get(params.at(-1));
      const assignments = sql.slice('UPDATE plans SET '.length).split(' WHERE ')[0].split(', ');
      assignments.forEach((assignment, index) => { plan[assignment.split(' = ')[0]] = params[index]; });
      return [{ affectedRows: 1 }];
    }
    if (sql === 'DELETE FROM plan_meals WHERE plan_id = ?') {
      writes.push({ sql, params });
      meals.set(params[0], []);
      return [{}];
    }
    if (sql.startsWith('INSERT INTO plan_meals ')) {
      writes.push({ sql, params });
      for (let index = 0; index < params.length; index += 12) {
        const [plan_id, idx, day, time, meal_type, recipe_id, custom_title, completed,
          swap_requested, notes, meal_servings, recipe_override] = params.slice(index, index + 12);
        meals.get(plan_id).push({ plan_id, idx, day, time, meal_type, recipe_id, custom_title,
          completed, swap_requested, notes, meal_servings, recipe_override });
      }
      return [{}];
    }
    if (sql === 'DELETE FROM plans WHERE id = ?') {
      writes.push({ sql, params });
      plans.delete(params[0]);
      // Mirror the plan_meals FK cascade; its real schema declaration is checked separately.
      meals.delete(params[0]);
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected database query: ${sql}`);
  }
  t.mock.method(pool, 'query', query);
  t.mock.method(pool, 'getConnection', async () => ({
    query,
    beginTransaction: async () => { transactions.push('begin'); },
    commit: async () => { transactions.push('commit'); },
    rollback: async () => { transactions.push('rollback'); },
    release: () => { transactions.push('release'); },
  }));

  const app = express();
  app.use(express.json());
  app.use('/api/plans', planRouter);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api/plans`;
  function request(viewer, target, method = 'PATCH', body = { title: 'Updated plan' }) {
    const user = users.get(viewer);
    const headers = { 'Content-Type': 'application/json' };
    if (user) headers.Authorization = `Bearer ${signAccessToken({ id: user.id, role: user.role, companyId: user.company_id }, `session-${user.id}`)}`;
    return fetch(`${base}/${target}`, { method, headers, ...(method === 'PATCH' ? { body: JSON.stringify(body) } : {}) });
  }

  try {
    await t.test('owner edits the same published plan without shifting dates, meal times or completion', async () => {
      const response = await request('dietitian', 'edit-owner', 'PATCH', {
        title: 'Updated weekly plan', published: true, week: '2026-09-21', weekEnd: '2026-09-27',
        meals: [{ day: 'Monday', time: '08:00 AM', mealType: 'Breakfast', customTitle: 'Oats with banana', completed: true, servings: 1 }],
        expectedMealState: [{ day: 'Monday', time: '08:00 AM', completed: true, swapRequested: false }],
      });
      assert.equal(response.status, 200);
      const plan = await response.json();
      assert.equal(plan._id, 'edit-owner');
      assert.equal(plan.published, true);
      assert.equal(plan.title, 'Updated weekly plan');
      assert.equal(plan.week, '2026-09-21');
      assert.equal(plan.weekEnd, '2026-09-27');
      assert.equal(plan.meals[0].day, 'Monday');
      assert.equal(plan.meals[0].time, '08:00 AM');
      assert.equal(plan.meals[0].customTitle, 'Oats with banana');
      assert.equal(plan.meals[0].completed, true);
      assert.deepEqual(transactions, ['begin', 'commit', 'release']);
      assert.deepEqual(stateChecks, ['edit-owner']);
      assert.equal(userReads.includes('client'), false, 'saving an already-published plan must not look up the email recipient again');
    });
    await t.test('same-company admin may edit without unpublishing or altering untouched meals', async () => {
      const previousMeals = structuredClone(meals.get('edit-admin'));
      const response = await request('admin', 'edit-admin');
      assert.equal(response.status, 200);
      const plan = await response.json();
      assert.equal(plan.published, true);
      assert.equal(plan.title, 'Updated plan');
      assert.deepEqual(meals.get('edit-admin'), previousMeals);
      assert.deepEqual(stateChecks, ['edit-owner'], 'ordinary updates without a snapshot retain their existing behavior');
    });
    await t.test('new client completion, swap requests, and changed slot identity reject stale saves atomically', async () => {
      const expectedMealState = [{ day: 'Monday', time: '08:00 AM', completed: true, swapRequested: false }];
      const originalMeal = structuredClone(meals.get('protected')[0]);
      for (const change of [{ completed: false }, { swap_requested: true }, { time: '09:00 AM' }, { day: 'Tuesday' }]) {
        meals.set('protected', [{ ...originalMeal, ...change }]);
        const changedMeals = structuredClone(meals.get('protected'));
        const before = writes.length;
        const response = await request('dietitian', 'protected', 'PATCH', {
          title: 'Must not overwrite the saved plan', published: true, expectedMealState,
          meals: [{ day: 'Monday', time: '08:00 AM', mealType: 'Breakfast', customTitle: 'Stale replacement', completed: true, swapRequested: false }],
        });
        assert.equal(response.status, 409);
        assert.match((await response.json()).error, /changed while you were editing/);
        assert.equal(writes.length, before, 'conflict must occur before any title or meal write');
        assert.equal(plans.get('protected').title, 'Published protected');
        assert.deepEqual(meals.get('protected'), changedMeals, 'the client action must remain intact');
        assert.deepEqual(transactions.slice(-3), ['begin', 'rollback', 'release']);
      }
      meals.set('protected', [originalMeal]);
    });
    await t.test('removed or added meals also reject an obsolete snapshot before writing', async () => {
      const before = writes.length;
      const response = await request('dietitian', 'protected', 'PATCH', { title: 'Obsolete', expectedMealState: [] });
      assert.equal(response.status, 409);
      assert.equal(writes.length, before);
    });
    await t.test('malformed expected meal flags are rejected by request validation', async () => {
      const before = writes.length;
      const response = await request('dietitian', 'protected', 'PATCH', {
        expectedMealState: [{ day: 'Monday', time: '08:00 AM', completed: 'yes', swapRequested: false }],
      });
      assert.equal(response.status, 400);
      assert.equal(writes.length, before);
    });
    await t.test('unauthenticated, client and unrelated dietitian requests cannot edit or delete', async () => {
      for (const method of ['PATCH', 'DELETE']) {
        for (const [viewer, status] of [[null, 401], ['client', 403], ['other-dietitian', 403]]) {
          const before = writes.length;
          assert.equal((await request(viewer, 'protected', method)).status, status, `${viewer} ${method}`);
          assert.equal(writes.length, before, 'denied requests must not modify any data');
        }
      }
    });
    await t.test('company boundaries hide plans from other-company admins and dietitians', async () => {
      for (const method of ['PATCH', 'DELETE']) {
        for (const [viewer, target] of [['foreign-admin', 'protected'], ['foreign-dietitian', 'protected'], ['admin', 'foreign-plan']]) {
          const before = writes.length;
          assert.equal((await request(viewer, target, method)).status, 404);
          assert.equal(writes.length, before);
        }
      }
    });
    await t.test('invalid edits fail without changing the published plan', async () => {
      const before = writes.length;
      const response = await request('dietitian', 'protected', 'PATCH', { week: '2026-09-28', weekEnd: '2026-09-21' });
      assert.equal(response.status, 400);
      assert.equal(writes.length, before);
      assert.equal(plans.get('protected').published, true);
    });
    await t.test('owner and company admin delete only the selected plan and its meal history', async () => {
      const protectedPlan = structuredClone(plans.get('protected'));
      const protectedMeals = structuredClone(meals.get('protected'));
      for (const [viewer, id] of [['dietitian', 'delete-owner'], ['admin', 'delete-admin']]) {
        const response = await request(viewer, id, 'DELETE');
        assert.equal(response.status, 204);
        assert.equal(await response.text(), '');
        assert.equal(plans.has(id), false);
        assert.equal(meals.has(id), false);
        assert.deepEqual(writes.at(-1), { sql: 'DELETE FROM plans WHERE id = ?', params: [id] });
      }
      assert.deepEqual(plans.get('protected'), protectedPlan);
      assert.deepEqual(meals.get('protected'), protectedMeals);
    });
    await t.test('deleted and nonexistent plan IDs return 404 without writes', async () => {
      for (const method of ['PATCH', 'DELETE']) {
        for (const id of ['delete-owner', 'missing-plan']) {
          const before = writes.length;
          assert.equal((await request('dietitian', id, method)).status, 404);
          assert.equal(writes.length, before);
        }
      }
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('deleting a plan cascades only to its meal rows, not to catalog recipes', async () => {
  const schema = await readFile(new URL('../../src/db/schema.sql', import.meta.url), 'utf8');
  assert.match(schema, /FOREIGN KEY \(plan_id\) REFERENCES plans\(id\) ON DELETE CASCADE/);
  assert.match(schema, /FOREIGN KEY \(recipe_id\) REFERENCES recipes\(id\) ON DELETE SET NULL/);
});

test('client meal actions detect replacement races without rejecting unchanged flags', async (t) => {
  let rowStillExists = false;
  let resultRows = 0;
  const rowId = 15;
  const reads = [];
  t.mock.method(pool, 'query', async (sql, params) => {
    reads.push(sql);
    if (sql === 'SELECT id FROM plan_meals WHERE plan_id = ? ORDER BY idx') return [[{ id: rowId }]];
    if (sql.startsWith('UPDATE plan_meals SET completed = ? WHERE id = ?')) {
      assert.deepEqual(params, [true, rowId]);
      return [{ affectedRows: resultRows }];
    }
    if (sql === 'SELECT id FROM plan_meals WHERE id = ? LIMIT 1') return [rowStillExists ? [{ id: rowId }] : []];
    if (sql.includes('FROM plans p') && sql.includes('WHERE p.id = ?')) {
      return [[{ id: 'plan', client_id: 'client', dietitian_id: 'dietitian', published: true, week: '2026-09-21', week_end: '2026-09-27' }]];
    }
    if (sql.includes('FROM plan_meals pm')) return [[]];
    throw new Error(`Unexpected query: ${sql}`);
  });
  await t.test('a row replaced between lookup and write returns conflict rather than false success', async () => {
    await assert.rejects(updatePlanMealByIndex('plan', 0, { completed: true }), (error) => error.status === 409);
  });
  await t.test('zero affected rows is harmless when the meal still exists with the same flag', async () => {
    rowStillExists = true;
    assert.equal((await updatePlanMealByIndex('plan', 0, { completed: true })).id, 'plan');
  });
  await t.test('normal successful meal updates do not need an extra existence check', async () => {
    resultRows = 1;
    reads.length = 0;
    assert.equal((await updatePlanMealByIndex('plan', 0, { completed: true })).id, 'plan');
    assert.equal(reads.some((sql) => sql.includes('WHERE id = ? LIMIT 1')), false);
  });
});
