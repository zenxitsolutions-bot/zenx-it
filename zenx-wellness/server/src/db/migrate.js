import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql');

// schema.sql is all `CREATE TABLE IF NOT EXISTS`, so it never alters a table that already exists
// from before a column was added — these `ALTER TABLE`s backfill those on an existing database.
// Each is applied individually and a "duplicate column"/"already exists" error is swallowed (see
// the catch below), so re-running this script stays a no-op once a change is already there.
const ALTERS = [
  // Google Meet (2026-08-29). meeting_url is the joinable link; google_event_id is the Calendar
  // event it came from, kept so a reschedule can PATCH that same event and a cancellation can
  // DELETE it instead of leaving an orphaned meeting on the dietitian's calendar. provider is
  // stored rather than assumed so a second provider (Zoom, Teams) can be added later without
  // having to guess what an existing row's link is.
  "ALTER TABLE calls ADD COLUMN meeting_url VARCHAR(512) NULL AFTER notes",
  "ALTER TABLE calls ADD COLUMN meeting_provider VARCHAR(32) NULL AFTER meeting_url",
  "ALTER TABLE calls ADD COLUMN google_event_id VARCHAR(255) NULL AFTER meeting_provider",
  // Position fixed to `AFTER notes` (not the now-removed `frequency` column it originally
  // followed) — see the 2026-08-22 DROP entries below for why `frequency` is gone.
  'ALTER TABLE calls ADD COLUMN reminder_minutes_before INT NULL AFTER notes',
  // Default FALSE, not TRUE — see the comment on this column in schema.sql.
  'ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE AFTER refresh_token_version',
  // See the comment above this key in schema.sql — without it, the availability guard's locking
  // range query falls back to idx_calls_dietitian alone and over-locks.
  'ALTER TABLE calls ADD KEY idx_calls_dietitian_scheduled (dietitian_id, scheduled_at)',
  // 2026-08-22: Repeat Call removed completely, including its schema — reverses the
  // frequency/recurrence_parent_id ALTERs a prior migration ran (this array only ever appends, it
  // never edits an already-shipped entry in place, so the original ADDs are replaced by explicit
  // DROPs here rather than deleted from history). Order matters: FK, then its index, then the
  // columns.
  'ALTER TABLE calls DROP FOREIGN KEY fk_calls_recurrence_parent',
  'ALTER TABLE calls DROP KEY idx_calls_recurrence_parent',
  'ALTER TABLE calls DROP COLUMN recurrence_parent_id',
  'ALTER TABLE calls DROP COLUMN frequency',
  // Program Plans (2026-08-22): program_plans itself is a brand-new table, created via
  // schema.sql's own CREATE TABLE IF NOT EXISTS — only the new users columns need backfilling here.
  'ALTER TABLE users ADD COLUMN program_plan_id VARCHAR(36) NULL AFTER must_change_password',
  'ALTER TABLE users ADD COLUMN plan_duration VARCHAR(50) NULL AFTER program_plan_id',
  'ALTER TABLE users ADD KEY idx_users_program_plan (program_plan_id)',
  'ALTER TABLE users ADD CONSTRAINT fk_users_program_plan FOREIGN KEY (program_plan_id) REFERENCES program_plans(id) ON DELETE SET NULL',
  // Recipe Category + Custom (2026-08-22): relax the fixed 4-value ENUM to free text — see the
  // comment on this column in schema.sql. A MODIFY COLUMN re-applying an already-matching
  // definition is a harmless no-op in MySQL (no error to swallow), unlike ADD/DROP above.
  'ALTER TABLE recipes MODIFY COLUMN meal_type VARCHAR(50) NOT NULL',
  // Enquiry history / Follow-up / Converted (2026-08-22): enquiry_history itself is a brand-new
  // table, created via schema.sql's own CREATE TABLE IF NOT EXISTS — only this new enquiries
  // column needs backfilling here.
  'ALTER TABLE enquiries ADD COLUMN converted_user_id VARCHAR(36) NULL AFTER status',
  'ALTER TABLE enquiries ADD KEY idx_enquiries_converted_user (converted_user_id)',
  'ALTER TABLE enquiries ADD CONSTRAINT fk_enquiries_converted_user FOREIGN KEY (converted_user_id) REFERENCES users(id) ON DELETE SET NULL',
  // Week Start/End Date (2026-08-22): nullable in the ALTER since existing rows have no value to
  // backfill (schema.sql declares it NOT NULL for fresh installs only, same asymmetry as the other
  // backfilled columns above). The UPDATE is plain idempotent DML — its own WHERE guard makes
  // re-running it a no-op, so it needs no error-code swallowing like the DDL statements above.
  'ALTER TABLE plans ADD COLUMN week_end DATE NULL AFTER week',
  'ALTER TABLE plans ADD KEY idx_plans_week_end (week_end)',
  'UPDATE plans SET week_end = DATE_ADD(week, INTERVAL 6 DAY) WHERE week_end IS NULL',
  // Progress body measurements (spec §3.1): all nullable, same asymmetry as the other backfilled
  // columns above — existing rows simply have no value for a measurement they never recorded.
  'ALTER TABLE progress ADD COLUMN waist DECIMAL(6, 2) NULL AFTER weight',
  'ALTER TABLE progress ADD COLUMN hip DECIMAL(6, 2) NULL AFTER waist',
  'ALTER TABLE progress ADD COLUMN thigh DECIMAL(6, 2) NULL AFTER hip',
  'ALTER TABLE progress ADD COLUMN upper_arm DECIMAL(6, 2) NULL AFTER thigh',
  // Client profile centrepiece (spec §6): meal notes, call reschedule tracking. client_notes
  // itself is a brand-new table, created via schema.sql's own CREATE TABLE IF NOT EXISTS.
  'ALTER TABLE plan_meals ADD COLUMN notes TEXT NULL AFTER swap_requested',
  'ALTER TABLE calls ADD COLUMN original_scheduled_at DATETIME(3) NULL AFTER reminder_minutes_before',
  'ALTER TABLE calls ADD COLUMN rescheduled_at DATETIME(3) NULL AFTER original_scheduled_at',
  // Timezone fix (docs/specs/2026-round2-fixes.md item 7): default 'UTC', not a guessed real
  // zone — see the comment on this column in schema.sql for why that's the non-breaking choice.
  "ALTER TABLE users ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'UTC' AFTER plan_duration",
  // Enquiry-linked calls (spec §2026-round2-fixes item 1): a Follow-up call no longer force-creates
  // a client account, so calls.client_id must accept NULL, paired with a new enquiry_id — see the
  // comment on these columns in schema.sql. Order matters: widen client_id to NULL first, then add
  // enquiry_id, then the CHECK last (it would reject the table if added before client_id allows NULL
  // and every existing row already satisfies "client_id set, enquiry_id NULL").
  'ALTER TABLE calls MODIFY COLUMN client_id VARCHAR(36) NULL',
  'ALTER TABLE calls ADD COLUMN enquiry_id VARCHAR(36) NULL AFTER client_id',
  'ALTER TABLE calls ADD KEY idx_calls_enquiry (enquiry_id)',
  'ALTER TABLE calls ADD CONSTRAINT fk_calls_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE',
  'ALTER TABLE calls ADD CONSTRAINT chk_calls_client_xor_enquiry CHECK ((client_id IS NULL) <> (enquiry_id IS NULL))',
  // Dietitian profile fields + account status (spec §2026-round2-fixes items 2/3). Default
  // 'active' — same non-breaking-default reasoning as must_change_password/timezone above.
  'ALTER TABLE users ADD COLUMN address VARCHAR(255) NULL AFTER phone',
  'ALTER TABLE users ADD COLUMN qualifications TEXT NULL AFTER address',
  "ALTER TABLE users ADD COLUMN account_status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active' AFTER qualifications",
  // Custom meal types/recipes in the weekly plan builder (spec §2026-round2-fixes item 4): relax
  // the fixed 4-value ENUM to free text (same MODIFY-is-a-no-op-when-already-applied reasoning as
  // recipes.meal_type above) and add custom_title for a manually typed recipe name. The two being
  // mutually exclusive is enforced by the trigger pair schema.sql creates right after plan_meals —
  // not a CHECK constraint (MySQL errno 3823: a CHECK can't reference a column that carries an FK
  // with a SET NULL/CASCADE/SET DEFAULT action, and fk_plan_meals_recipe is ON DELETE SET NULL) —
  // and schema.sql runs unconditionally on every migrate() call, so no ALTER backfill is needed
  // here for the trigger itself.
  'ALTER TABLE plan_meals MODIFY COLUMN meal_type VARCHAR(50) NOT NULL',
  'ALTER TABLE plan_meals ADD COLUMN custom_title VARCHAR(255) NULL AFTER recipe_id',
  // .ics SEQUENCE for the booking/reschedule/cancellation calendar invite (server/src/emails/ics.js)
  // — see the comment on this column in schema.sql.
  'ALTER TABLE calls ADD COLUMN ics_sequence INT NOT NULL DEFAULT 0 AFTER reminder_minutes_before',
  // Consultation schedule (server/src/services/consultationScheduleService.js): consultation_schedules
  // itself is a brand-new table, created via schema.sql's own CREATE TABLE IF NOT EXISTS — only this
  // new calls column needs backfilling here, and only after that table exists (schema.sql's CREATEs
  // always run before this ALTERS array — see migrate() below).
  'ALTER TABLE calls ADD COLUMN consultation_schedule_id VARCHAR(36) NULL AFTER ics_sequence',
  'ALTER TABLE calls ADD KEY idx_calls_consultation_schedule (consultation_schedule_id)',
  'ALTER TABLE calls ADD CONSTRAINT fk_calls_consultation_schedule FOREIGN KEY (consultation_schedule_id) REFERENCES consultation_schedules(id) ON DELETE SET NULL',
  // ZenX SSO handoff (auth.controller.js#handoff): links a user to admin-server's zenx_users.id —
  // see the comment on this column in schema.sql.
  'ALTER TABLE users ADD COLUMN zenx_user_id VARCHAR(36) NULL AFTER timezone',
  'ALTER TABLE users ADD UNIQUE KEY uq_users_zenx_user (zenx_user_id)',
  // Multi-tenancy (2026-08-27): see the company_id comments on users/enquiries/program_plans in
  // schema.sql. Added NULL here (fresh installs declare NOT NULL) and immediately backfilled onto
  // env.legacyCompanyId — every pre-existing row belongs to that one real, ZenX-managed company
  // (admin-server's seedLegacyCompany), never left unscoped. Fails fast (not silently skipped) if
  // that env var is unset and there's actually data to backfill, since a silent skip here would
  // leave every existing row permanently invisible once the app-level company filtering below ships.
  'ALTER TABLE users ADD COLUMN company_id VARCHAR(36) NULL AFTER zenx_user_id',
  'ALTER TABLE users ADD COLUMN company_slug VARCHAR(255) NULL AFTER company_id',
  'ALTER TABLE users ADD KEY idx_users_company (company_id)',
  'ALTER TABLE enquiries ADD COLUMN company_id VARCHAR(36) NULL AFTER id',
  'ALTER TABLE enquiries ADD KEY idx_enquiries_company (company_id)',
  'ALTER TABLE program_plans ADD COLUMN company_id VARCHAR(36) NULL AFTER id',
  'ALTER TABLE program_plans ADD KEY idx_program_plans_company (company_id)',
  // Company website (2026-08-28): mirrored from ZenX alongside name/slug/logo_url — see
  // MIRRORED_TABLES below and models/Company.js#upsertCompanyFromHandoff. Nullable: it's optional
  // on the ZenX side too, and every already-mirrored company predates the claim carrying it.
  'ALTER TABLE companies ADD COLUMN website VARCHAR(1024) NULL AFTER slug',
  // Timezone-aware scheduling: users.timezone already existed (dietitian-only in practice);
  // country/date_format/time_format are new, and timezone itself now applies to every role — see
  // the column comments in schema.sql for defaults/rationale.
  'ALTER TABLE users ADD COLUMN country CHAR(2) NULL AFTER timezone',
  "ALTER TABLE users ADD COLUMN date_format VARCHAR(20) NOT NULL DEFAULT 'MMM d, yyyy' AFTER country",
  "ALTER TABLE users ADD COLUMN time_format ENUM('12h', '24h') NOT NULL DEFAULT '12h' AFTER date_format",
  // Dedupe flag for reminderScheduler.js — see the column comment in schema.sql.
  'ALTER TABLE calls ADD COLUMN reminder_sent_at DATETIME(3) NULL AFTER rescheduled_at',
  // Stamped on password login and ZenX SSO handoff so the admin customer page can show a real
  // last-login instead of "Never" when the person only ever signs into this app.
  'ALTER TABLE users ADD COLUMN last_login DATETIME(3) NULL AFTER updated_at',
];

// admin-server (ZenX) is the source of truth for company identity; this is only the local mirror
// wellness-app needs so users.company_id/company_slug point at something real (see
// models/Company.js). It deliberately isn't in schema.sql — that file is this app's *own* schema —
// but it does have to exist before the first SSO handoff tries to upsert into it, and before the
// ALTER above and backfillLegacyCompany's company_slug lookup can touch it. Columns are only the
// subset wellness-app actually renders, not a copy of admin-server's much wider companies table.
const MIRRORED_TABLES = [
  `CREATE TABLE IF NOT EXISTS companies (
     id VARCHAR(36) PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     slug VARCHAR(255) NOT NULL,
     website VARCHAR(1024) NULL,
     logo_url VARCHAR(1024) NULL,
     status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
     created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
     updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
     UNIQUE KEY uq_companies_slug (slug)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS device_tokens (
     id VARCHAR(36) PRIMARY KEY,
     user_id VARCHAR(36) NOT NULL,
     token VARCHAR(512) NOT NULL,
     platform ENUM('web', 'ios', 'android') NOT NULL DEFAULT 'web',
     created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
     last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
     UNIQUE KEY uq_device_tokens_token (token),
     KEY idx_device_tokens_user (user_id),
     CONSTRAINT fk_device_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

// Run after ALTERS so the columns above are guaranteed to exist first. Each is a no-op once every
// row already has a company_id (the `WHERE company_id IS NULL` guard), so re-running migrate.js
// stays idempotent like everything else here.
async function backfillLegacyCompany(conn) {
  const [[{ pending }]] = await conn.query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE company_id IS NULL) +
       (SELECT COUNT(*) FROM enquiries WHERE company_id IS NULL) +
       (SELECT COUNT(*) FROM program_plans WHERE company_id IS NULL) AS pending`
  );
  if (Number(pending) === 0) return;

  if (!env.legacyCompanyId) {
    throw new Error(
      `[migrate] ${pending} row(s) need a company_id backfilled but LEGACY_COMPANY_ID is not set. ` +
        'Run admin-server\'s seed (creates/prints the Legacy Practice company id), set LEGACY_COMPANY_ID ' +
        'in wellness-app/server/.env, then re-run db:migrate.'
    );
  }

  await conn.query('UPDATE users SET company_id = ? WHERE company_id IS NULL', [env.legacyCompanyId]);
  await conn.query('UPDATE enquiries SET company_id = ? WHERE company_id IS NULL', [env.legacyCompanyId]);
  await conn.query('UPDATE program_plans SET company_id = ? WHERE company_id IS NULL', [env.legacyCompanyId]);
  console.log(`[migrate] backfilled ${pending} row(s) onto company_id = ${env.legacyCompanyId}`);

  // company_slug (2026-08-28, company-slug URLs): a user with company_id but no company_slug
  // lands on /null/app/... — see CompanySlugGuard.jsx. Best-effort only: the `companies` table
  // itself isn't part of this schema (it's admin-server's, mirrored locally on demand — see
  // models/Company.js), so a deployment that hasn't talked to admin-server yet won't have it.
  try {
    const [[legacyCompany]] = await conn.query('SELECT slug FROM companies WHERE id = ?', [env.legacyCompanyId]);
    if (legacyCompany) {
      await conn.query('UPDATE users SET company_slug = ? WHERE company_id = ? AND company_slug IS NULL', [
        legacyCompany.slug,
        env.legacyCompanyId,
      ]);
    } else {
      console.warn(`[migrate] no companies row for ${env.legacyCompanyId} yet — company_slug left NULL, will backfill on next SSO login`);
    }
  } catch (err) {
    console.warn('[migrate] company_slug backfill skipped (companies table not present yet):', err.message);
  }
}

async function migrate() {
  const sql = readFileSync(schemaPath, 'utf8');
  // multipleStatements is only turned on for this one-off DDL run, never for the app's pool.
  const conn = await mysql.createConnection({ uri: env.mysqlUrl, multipleStatements: true });
  console.log(`[migrate] connected → ${env.mysqlUrl}`);
  await conn.query(sql);
  console.log('[migrate] schema applied');

  // Before ALTERS: the `companies` ALTER below targets this table, and it must exist by the time
  // the first handoff upserts into it either way.
  for (const statement of MIRRORED_TABLES) {
    await conn.query(statement);
  }
  console.log('[migrate] mirrored tables applied');

  for (const statement of ALTERS) {
    try {
      await conn.query(statement);
      console.log(`[migrate] applied: ${statement}`);
    } catch (err) {
      // 1060/1061/1826 = adding something that's already there (duplicate column/key/FK); 1091 =
      // dropping something that was never there (unknown column/key/FK) — both directions mean
      // this exact statement's effect already matches the current schema, so skip it.
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

  await backfillLegacyCompany(conn);

  await conn.end();
}

migrate().catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
