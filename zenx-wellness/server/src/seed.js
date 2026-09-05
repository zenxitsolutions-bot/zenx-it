import { pool } from './db/pool.js';
import { findUserByEmail, createUser, updateUser } from './models/User.js';
import { findRecipesByTitles, createRecipe } from './models/Recipe.js';
import { findPlanByClient, createPlan } from './models/Plan.js';
import { createProgress } from './models/Progress.js';
import { createCall, updateCallById } from './models/Call.js';
import { createClientNote } from './models/ClientNote.js';
import { createMessage, markConversationRead } from './models/Message.js';
import { createReport, addReportFeedback } from './models/Report.js';
import { hashPassword } from './utils/password.js';
import { env } from './config/env.js';

// One known-credential user per role, for local dev and manual portal testing.
// Documented in docs/worklog — re-run any time with `npm run seed` (idempotent: existing
// users are left untouched, never overwritten).
const SEED_USERS = [
  { name: 'Ava Admin', email: 'admin@nourishly.test', password: 'Password123!', role: 'admin' },
  { name: 'Dana Dietitian', email: 'dietitian@nourishly.test', password: 'Password123!', role: 'dietitian' },
  { name: 'Cleo Client', email: 'client@nourishly.test', password: 'Password123!', role: 'client' },
  // A second client with no plan/progress/calls/reports yet — exercises the dietitian screens'
  // empty states (client profile page, builder client-select) alongside Cleo's fully-seeded data.
  { name: 'Priya Shah', email: 'client2@nourishly.test', password: 'Password123!', role: 'client' },
];

const SEED_RECIPES = [
  {
    title: 'Berry & chia breakfast bowl',
    emoji: '🥣',
    mealType: 'Breakfast',
    prepTime: '10 min',
    tags: ['High protein', 'Vegetarian'],
    kcal: 320,
    protein: 18,
    ingredients: 'Greek yogurt, mixed berries, chia seeds, almonds, a drizzle of honey.',
    instructions: 'Layer yogurt and berries, top with chia and almonds, drizzle with honey.',
  },
  {
    title: 'Rainbow quinoa nourish bowl',
    emoji: '🥗',
    mealType: 'Lunch',
    prepTime: '20 min',
    tags: ['Fibre rich', 'Vegan'],
    kcal: 480,
    protein: 16,
    ingredients: 'Quinoa, roasted vegetables, chickpeas, tahini dressing.',
    instructions: 'Cook quinoa, roast the vegetables, toss with chickpeas and tahini dressing.',
  },
  {
    title: 'Lentil & veggie comfort soup',
    emoji: '🍲',
    mealType: 'Dinner',
    prepTime: '30 min',
    tags: ['Gut friendly', 'Vegan'],
    kcal: 390,
    protein: 20,
    ingredients: 'Red lentils, carrots, celery, onion, vegetable stock, herbs.',
    instructions: 'Sauté the vegetables, add lentils and stock, simmer until tender, season with herbs.',
  },
  {
    title: 'Apple slices with nut butter',
    emoji: '🍏',
    mealType: 'Snack',
    prepTime: '5 min',
    tags: ['Quick', 'Vegetarian'],
    kcal: 210,
    protein: 6,
    ingredients: 'Apple, almond butter.',
    instructions: 'Slice the apple and serve with almond butter for dipping.',
  },
];

// UTC-based deliberately — see the matching fix + comment in
// client/src/lib/planBuilder.js and server/src/controllers/insights.controller.js. A local-time
// version here silently stored the seeded Plan's `week` shifted by a day in timezones ahead of
// UTC, which the plan builder (querying by exact `week` match) would then never find.
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff)).toISOString().slice(0, 10);
}

function endOfWeek(weekStart) {
  const [year, month, day] = weekStart.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 6)).toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seedDemoData(dietitian, client) {
  let recipes = await findRecipesByTitles(SEED_RECIPES.map((r) => r.title));
  if (recipes.length === 0) {
    recipes = [];
    for (const r of SEED_RECIPES) {
      recipes.push(await createRecipe({ ...r, createdBy: dietitian.id }));
    }
    console.log(`[seed] created ${recipes.length} demo recipes`);
  } else {
    console.log('[seed] demo recipes already exist, skipped');
  }

  const existingPlan = await findPlanByClient(client.id);
  if (existingPlan) {
    console.log('[seed] demo plan/progress/calls/report already exist for the seed client, skipped');
    return;
  }

  const [breakfast, lunch, dinner, snack] = recipes;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const meals = days.flatMap((day, i) => [
    {
      day,
      time: '8:00 AM',
      mealType: 'Breakfast',
      recipe: breakfast.id,
      completed: i < 2,
      notes: i === 0 ? 'Client mentioned mild bloating — keep portion light this week.' : null,
    },
    { day, time: '1:00 PM', mealType: 'Lunch', recipe: lunch.id, completed: i < 1 },
    { day, time: '7:30 PM', mealType: 'Dinner', recipe: i % 3 === 0 ? snack.id : dinner.id },
  ]);

  const week = startOfWeek(new Date());
  await createPlan({
    client: client.id,
    dietitian: dietitian.id,
    title: "Cleo's weekly nourish plan",
    week,
    weekEnd: endOfWeek(week),
    meals,
    published: true,
  });
  console.log('[seed] created demo weekly plan');

  const progressEntries = [
    { date: daysAgo(35), weight: 72, waist: 84, hip: 102, thigh: 58, upperArm: 31, energy: 5, adherence: 70 },
    { date: daysAgo(28), weight: 71.1, waist: 83, hip: 101, thigh: 57.5, upperArm: 30.5, energy: 6, adherence: 75 },
    { date: daysAgo(21), weight: 70.2, waist: 82, hip: 100, thigh: 57, upperArm: 30.5, energy: 6, adherence: 80 },
    { date: daysAgo(14), weight: 69, waist: 81, hip: 99, thigh: 56.5, upperArm: 30, energy: 7, adherence: 85 },
    { date: daysAgo(7), weight: 68.4, waist: 80, hip: 98, thigh: 56, upperArm: 30, energy: 7, adherence: 88 },
    { date: daysAgo(1), weight: 67.8, waist: 79, hip: 97, thigh: 55.5, upperArm: 29.5, energy: 8, adherence: 90 },
  ];
  for (const entry of progressEntries) {
    await createProgress({ ...entry, client: client.id });
  }
  console.log(`[seed] created ${progressEntries.length} demo progress entries`);

  const upcomingCall = await createCall({
    client: client.id,
    dietitian: dietitian.id,
    scheduledAt: daysAgo(-2),
    notes: 'Progress check-in',
  });
  // Demonstrates the reschedule-tracking columns (client profile Calls tab "Rescheduled" badge) —
  // done directly against the model, mirroring exactly what call.controller.js#updateCall does on
  // a genuine scheduledAt change, since the seed script talks to models, not the HTTP API.
  await updateCallById(upcomingCall.id, {
    scheduledAt: daysAgo(-5),
    rescheduledAt: new Date(),
    originalScheduledAt: upcomingCall.scheduledAt,
  });
  // createCall has no `status` param (new calls always start `scheduled` — see Call.js); marking
  // this one `completed` for the demo goes through the same patch path a real "Mark complete"
  // click would use.
  const pastCall = await createCall({
    client: client.id,
    dietitian: dietitian.id,
    scheduledAt: daysAgo(10),
    notes: 'Initial consult',
  });
  await updateCallById(pastCall.id, { status: 'completed' });
  console.log('[seed] created demo calls (1 upcoming + rescheduled, 1 completed)');

  await createClientNote({
    client: client.id,
    author: dietitian.id,
    body: 'Prefers evening check-ins — works late shifts most weekdays.',
  });
  console.log('[seed] created demo client note');

  // One read message (dietitian's greeting, already seen) and one unread (client's reply) — so
  // the demo shows both a populated thread and a real unread badge/indicator on first login.
  await createMessage({
    client: client.id,
    dietitian: dietitian.id,
    sender: dietitian.id,
    body: "Hi Cleo! Just checking in — how's the new plan feeling so far?",
  });
  await markConversationRead(client.id, dietitian.id, client.id);
  await createMessage({
    client: client.id,
    dietitian: dietitian.id,
    sender: client.id,
    body: 'Going well, thank you! The breakfast options are much easier to stick to.',
  });
  console.log('[seed] created demo messages (1 read, 1 unread)');

  // filePath doesn't point to a real file in server/uploads/ — this is metadata-only seed data,
  // reports uploaded for real through the UI will have a working download link.
  const report = await createReport({
    client: client.id,
    fileName: 'lipid-panel.pdf',
    filePath: 'seed-lipid-panel.pdf',
    note: 'Latest lab results from my checkup.',
  });
  await addReportFeedback(report.id, {
    authorId: dietitian.id,
    authorName: dietitian.name,
    message: 'Thanks for sharing this — your numbers look steady, keep up the great work!',
    status: 'reviewed',
  });
  console.log('[seed] created demo report with dietitian feedback');
}

async function seed() {
  // Demo users need a real company_id (multi-tenancy — see schema.sql's comment on users.company_id).
  // Reuses the same LEGACY_COMPANY_ID env var db/migrate.js's backfill uses, from admin-server's
  // seedLegacyCompany — there is no separate "seed company" concept.
  if (!env.legacyCompanyId) {
    throw new Error('LEGACY_COMPANY_ID is not configured — run admin-server\'s seed first and set it in .env');
  }
  // company_slug (2026-08-28, company-slug URLs): every seeded user needs one so they land on a
  // real /:companySlug/app/... URL instead of /null/app/... — see CompanySlugGuard.jsx.
  const [[legacyCompany]] = await pool.query('SELECT slug FROM companies WHERE id = ?', [env.legacyCompanyId]);
  if (!legacyCompany) {
    throw new Error(`No local companies row for LEGACY_COMPANY_ID=${env.legacyCompanyId} — run db:migrate first.`);
  }

  const created = [];
  const skipped = [];

  for (const { name, email, password, role } of SEED_USERS) {
    const existing = await findUserByEmail(email);
    if (existing) {
      skipped.push(email);
      continue;
    }
    await createUser({
      name,
      email,
      passwordHash: await hashPassword(password),
      role,
      companyId: env.legacyCompanyId,
      companySlug: legacyCompany.slug,
    });
    created.push(email);
  }

  const dietitian = await findUserByEmail('dietitian@nourishly.test');
  const client = await findUserByEmail('client@nourishly.test');
  const client2 = await findUserByEmail('client2@nourishly.test');
  if (!client.assignedDietitian) await updateUser(client.id, { assignedDietitian: dietitian.id });
  if (!client2.assignedDietitian) await updateUser(client2.id, { assignedDietitian: dietitian.id });

  console.log(`[seed] created: ${created.length ? created.join(', ') : '(none)'}`);
  console.log(`[seed] already existed, skipped: ${skipped.length ? skipped.join(', ') : '(none)'}`);
  console.log('[seed] credentials — see docs/worklog for the dated entry, or SEED_USERS above (password for all: Password123!)');

  await seedDemoData(dietitian, client);

  await pool.end();
}

seed().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
