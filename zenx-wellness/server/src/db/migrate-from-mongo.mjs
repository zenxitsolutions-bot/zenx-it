// One-off migration: copies existing MongoDB data into MySQL (run `npm run db:migrate` first to
// create the schema). Uses the native `mongodb` driver directly — no need for Mongoose or its
// schemas, this script only ever reads raw documents.
//
// Every Mongo document's existing `_id.toString()` (24-char ObjectId hex) becomes the new row's
// `id` in MySQL — VARCHAR(36) comfortably holds both that and a fresh crypto.randomUUID() for
// anything created after the migration. Reusing the old id is what makes this safe: every foreign
// key value (client, dietitian, recipe, author, ...) carries over unchanged, no id-remapping
// table needed.
//
// Usage: MONGO_URI=mongodb://127.0.0.1:27017/nourishly npm run migrate:from-mongo

import { MongoClient } from 'mongodb';
import { withTransaction, pool } from './pool.js';
import { env } from '../config/env.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nourishly';

function oid(value) {
  return value === null || value === undefined ? null : value.toString();
}

async function migrateUsers(conn, db) {
  // company_id (multi-tenancy, 2026-08-27): every row created by this one-off script predates
  // tenants, same as the rest of this app's pre-existing data — see db/migrate.js's
  // backfillLegacyCompany for the live equivalent of this same choice.
  if (!env.legacyCompanyId) throw new Error('LEGACY_COMPANY_ID is not configured');
  const docs = await db.collection('users').find().toArray();
  for (const doc of docs) {
    await conn.query(
      `INSERT INTO users (id, name, email, password_hash, role, phone, assigned_dietitian_id, refresh_token_version, company_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        oid(doc._id),
        doc.name,
        doc.email,
        doc.passwordHash,
        doc.role,
        doc.phone ?? null,
        oid(doc.assignedDietitian),
        doc.refreshTokenVersion ?? 0,
        env.legacyCompanyId,
        doc.createdAt,
        doc.updatedAt,
      ]
    );
  }
  console.log(`[migrate-from-mongo] users: ${docs.length}`);
  return docs.length;
}

async function migrateEnquiries(conn, db) {
  const docs = await db.collection('enquiries').find().toArray();
  for (const doc of docs) {
    await conn.query(
      `INSERT INTO enquiries (id, goal, name, email, phone, preferred_slot, note, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        oid(doc._id),
        doc.goal,
        doc.name,
        doc.email,
        doc.phone,
        doc.preferredSlot ?? null,
        doc.note ?? null,
        doc.status,
        doc.createdAt,
        doc.updatedAt,
      ]
    );
  }
  console.log(`[migrate-from-mongo] enquiries: ${docs.length}`);
  return docs.length;
}

async function migrateRecipes(conn, db) {
  const docs = await db.collection('recipes').find().toArray();
  let tagCount = 0;
  for (const doc of docs) {
    await conn.query(
      `INSERT INTO recipes (id, title, emoji, meal_type, prep_time, kcal, protein, ingredients, instructions, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        oid(doc._id),
        doc.title,
        doc.emoji,
        doc.mealType,
        doc.prepTime,
        doc.kcal ?? null,
        doc.protein ?? null,
        doc.ingredients,
        doc.instructions,
        oid(doc.createdBy),
        doc.createdAt,
        doc.updatedAt,
      ]
    );
    for (const tag of doc.tags ?? []) {
      await conn.query('INSERT INTO recipe_tags (recipe_id, tag) VALUES (?, ?)', [oid(doc._id), tag]);
      tagCount += 1;
    }
  }
  console.log(`[migrate-from-mongo] recipes: ${docs.length} (${tagCount} tags)`);
  return docs.length;
}

async function migratePlans(conn, db) {
  const docs = await db.collection('plans').find().toArray();
  let mealCount = 0;
  for (const doc of docs) {
    const weekEnd = new Date(doc.week);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    await conn.query(
      `INSERT INTO plans (id, client_id, dietitian_id, title, week, week_end, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        oid(doc._id),
        oid(doc.client),
        oid(doc.dietitian),
        doc.title,
        doc.week,
        weekEnd,
        !!doc.published,
        doc.createdAt,
        doc.updatedAt,
      ]
    );
    const meals = doc.meals ?? [];
    for (let idx = 0; idx < meals.length; idx += 1) {
      const meal = meals[idx];
      await conn.query(
        `INSERT INTO plan_meals (plan_id, idx, day, time, meal_type, recipe_id, completed, swap_requested)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [oid(doc._id), idx, meal.day, meal.time, meal.mealType, oid(meal.recipe), !!meal.completed, !!meal.swapRequested]
      );
      mealCount += 1;
    }
  }
  console.log(`[migrate-from-mongo] plans: ${docs.length} (${mealCount} meals)`);
  return docs.length;
}

async function migrateCalls(conn, db) {
  const docs = await db.collection('calls').find().toArray();
  for (const doc of docs) {
    await conn.query(
      `INSERT INTO calls (id, client_id, dietitian_id, scheduled_at, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [oid(doc._id), oid(doc.client), oid(doc.dietitian), doc.scheduledAt, doc.status, doc.notes ?? null, doc.createdAt, doc.updatedAt]
    );
  }
  console.log(`[migrate-from-mongo] calls: ${docs.length}`);
  return docs.length;
}

async function migrateProgress(conn, db) {
  const docs = await db.collection('progresses').find().toArray();
  for (const doc of docs) {
    await conn.query(
      `INSERT INTO progress (id, client_id, date, weight, energy, adherence, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [oid(doc._id), oid(doc.client), doc.date, doc.weight, doc.energy ?? null, doc.adherence ?? null, doc.createdAt, doc.updatedAt]
    );
  }
  console.log(`[migrate-from-mongo] progress: ${docs.length}`);
  return docs.length;
}

async function migrateReports(conn, db) {
  const docs = await db.collection('reports').find().toArray();
  let feedbackCount = 0;
  for (const doc of docs) {
    await conn.query(
      `INSERT INTO reports (id, client_id, file_name, file_path, note, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [oid(doc._id), oid(doc.client), doc.fileName, doc.filePath, doc.note ?? null, doc.status, doc.createdAt, doc.updatedAt]
    );
    for (const entry of doc.feedback ?? []) {
      await conn.query(
        `INSERT INTO report_feedback (id, report_id, author_id, author_name, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [oid(entry._id), oid(doc._id), oid(entry.author), entry.authorName, entry.message, entry.createdAt]
      );
      feedbackCount += 1;
    }
  }
  console.log(`[migrate-from-mongo] reports: ${docs.length} (${feedbackCount} feedback entries)`);
  return docs.length;
}

async function migrate() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log(`[migrate-from-mongo] connected to Mongo → ${MONGO_URI}`);
  const db = client.db();

  try {
    // FK-safe order: users first, then anything referencing users, then anything referencing
    // those. One transaction — a partial migration would be worse than no migration.
    await withTransaction(async (conn) => {
      await migrateUsers(conn, db);
      await migrateEnquiries(conn, db);
      await migrateRecipes(conn, db);
      await migratePlans(conn, db);
      await migrateCalls(conn, db);
      await migrateProgress(conn, db);
      await migrateReports(conn, db);
    });
    console.log('[migrate-from-mongo] done');
  } finally {
    await client.close();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('[migrate-from-mongo] failed', err);
  process.exit(1);
});
