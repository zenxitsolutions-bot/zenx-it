import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql');

// schema.sql is all `CREATE TABLE IF NOT EXISTS` — a no-op on a table that already exists, so a new
// column added to one of those blocks never reaches an existing database on its own; every schema
// change after the very first migrate run needs its own explicit statement here too. Following
// wellness-app's own server/src/db/migrate.js convention (each wrapped in the same try/catch below
// so reruns stay idempotent).
const ALTERS = [
  // Timezone-aware follow-ups (see the column comments in schema.sql for the full rationale).
  // scheduled_at_utc is added nullable here (fresh installs declare it NOT NULL) and immediately
  // backfilled below — same asymmetric pattern wellness-app's own migrate.js uses for a NOT NULL
  // column added after that table already had rows.
  'ALTER TABLE followups ADD COLUMN scheduled_at_utc DATETIME(3) NULL AFTER scheduled_time',
  "ALTER TABLE followups ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'UTC' AFTER scheduled_at_utc",
  'ALTER TABLE followups ADD COLUMN reminder_sent_at DATETIME(3) NULL AFTER completed_at',
  'ALTER TABLE followups ADD KEY idx_followups_scheduled_at_utc (scheduled_at_utc)',
  // Zero-numeric-shift backfill: existing scheduled_date+scheduled_time were never timezone-aware
  // (raw browser date/time inputs, redisplayed via naive browser-local parsing — no UTC conversion
  // anywhere in that round-trip), so there is no way to recover what zone a historical row was
  // really meant in. This reinterprets the existing literal digits as-is (no shift) with timezone
  // explicitly flagged 'UTC' as a neutral placeholder, not a guess — see FollowupsPage.tsx's
  // "unverified timezone" banner for rows still carrying it after this runs.
  "UPDATE followups SET scheduled_at_utc = TIMESTAMP(scheduled_date, scheduled_time), timezone = 'UTC' WHERE scheduled_at_utc IS NULL",

  "ALTER TABLE profiles ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'UTC' AFTER status",
  'ALTER TABLE profiles ADD COLUMN country CHAR(2) NULL AFTER timezone',
  "ALTER TABLE profiles ADD COLUMN date_format VARCHAR(20) NOT NULL DEFAULT 'MMM d, yyyy' AFTER country",
  "ALTER TABLE profiles ADD COLUMN time_format ENUM('12h', '24h') NOT NULL DEFAULT '12h' AFTER date_format",

  "ALTER TABLE users ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'UTC' AFTER must_change_password",
  'ALTER TABLE users ADD COLUMN country CHAR(2) NULL AFTER timezone',
  "ALTER TABLE users ADD COLUMN date_format VARCHAR(20) NOT NULL DEFAULT 'MMM d, yyyy' AFTER country",
  "ALTER TABLE users ADD COLUMN time_format ENUM('12h', '24h') NOT NULL DEFAULT '12h' AFTER date_format",

  'ALTER TABLE companies ADD COLUMN timezone VARCHAR(64) NULL AFTER country',
  "ALTER TABLE companies ADD COLUMN subscription_plan ENUM('starter', 'growth', 'enterprise') NULL AFTER status",
  // CREATE TABLE IF NOT EXISTS never adds this to a users table that already existed without it,
  // so last_login stayed NULL-looking on the customer page (the column simply was not there).
  'ALTER TABLE users ADD COLUMN last_login DATETIME(3) NULL AFTER updated_at',
];

// wellness-app's own migrate.js can assume its database already exists (it always has). This one
// can't — `zenx_admin` is brand new — so create it first via a connection with no database name.
async function ensureDatabaseExists() {
  const url = new URL(env.mysqlUrl);
  const dbName = url.pathname.replace(/^\//, '');
  url.pathname = '/';
  const conn = await mysql.createConnection({ uri: url.toString() });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4`);
  await conn.end();
  console.log(`[migrate] ensured database exists: ${dbName}`);
}

async function migrate() {
  await ensureDatabaseExists();

  const sql = readFileSync(schemaPath, 'utf8');
  const conn = await mysql.createConnection({ uri: env.mysqlUrl, multipleStatements: true });
  console.log(`[migrate] connected → ${env.mysqlUrl}`);
  await conn.query(sql);
  console.log('[migrate] schema applied');

  for (const statement of ALTERS) {
    try {
      await conn.query(statement);
      console.log(`[migrate] applied: ${statement}`);
    } catch (err) {
      if (
        err.code === 'ER_DUP_FIELDNAME' ||
        err.code === 'ER_DUP_KEYNAME' ||
        err.errno === 1826 /* dup FK */ ||
        err.errno === 1091 /* ER_CANT_DROP_FIELD_OR_KEY */ ||
        err.errno === 3822 /* ER_CHECK_CONSTRAINT_DUP_NAME */
      ) {
        console.log(`[migrate] already applied, skipping: ${statement}`);
      } else {
        throw err;
      }
    }
  }

  await conn.end();
}

migrate().catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
