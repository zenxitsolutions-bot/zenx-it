-- Nourishly MySQL schema.
-- Every user-facing entity uses a VARCHAR(36) id (app-generated UUID, see src/db/id.js) so
-- foreign keys stay plain string comparisons — matching how req.user.id / String(x) comparisons
-- already work throughout the controllers. The two purely-internal join tables (recipe_tags,
-- plan_meals) use AUTO_INCREMENT instead, since their own id is never sent to the client.

-- A named service/program a client is on (e.g. "Weight Loss", "Diabetes Management") — entirely
-- separate from the `plans`/`plan_meals` weekly meal-plan tables below. Named `program_plans`
-- (not `plans`) specifically to avoid colliding with that existing, unrelated concept. Admin-only
-- create/edit/activate-deactivate (no delete) — automatically visible to every dietitian, so no
-- per-dietitian ownership column.
-- company_id (2026-08-27, multi-tenancy): the ZenX company (admin-server's companies.id) this
-- program plan belongs to — each org curates its own catalog, never shared across companies. No
-- FK: cross-service id, same trust model as users.zenx_user_id. NOT NULL here (fresh installs
-- only) — migrate.js's ALTERS backfill it as nullable on an existing database, same asymmetric
-- pattern already used for e.g. plans.week_end/users.account_status.
CREATE TABLE IF NOT EXISTS program_plans (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_program_plans_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('client', 'dietitian', 'admin') NOT NULL DEFAULT 'client',
  phone VARCHAR(50),
  -- address/qualifications are meaningful for role='dietitian' (spec §2026-round2-fixes items 2/3
  -- — a dietitian's profile needs full contact + credential details); left generic on `users`
  -- rather than a separate dietitian-only table, same convention already used for phone/timezone.
  address VARCHAR(255) NULL,
  qualifications TEXT NULL,
  -- Deliberately never touches assigned_dietitian_id, calls, or plans on its own — see the
  -- account_status comment further down and enquiry.controller.js-style "don't silently orphan"
  -- reasoning in docs/worklog/2026-08-23.md. 'suspended' blocks login (middleware/authenticate.js);
  -- 'inactive' does not — a dietitian temporarily not taking new work can still manage their
  -- existing clients/calls. Neither state hides or cancels any existing call/assignment.
  account_status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  assigned_dietitian_id VARCHAR(36) NULL,
  refresh_token_version INT NOT NULL DEFAULT 0,
  -- DB-level default is FALSE, never TRUE: an ALTER that defaulted existing rows to TRUE would
  -- retroactively lock every already-existing user out on their next login. TRUE is only ever set
  -- explicitly, by the admin-create code path (user.controller.js#createUser) — see
  -- docs/specs/implementation-plan.md §2 "Design note".
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  -- Only meaningful for role='client' (same convention as assigned_dietitian_id above) — the
  -- named service/program plan and a fixed-choice duration string (e.g. "3 months"), both set at
  -- client creation/edit time by an admin. See program_plans above.
  program_plan_id VARCHAR(36) NULL,
  plan_duration VARCHAR(50) NULL,
  -- IANA zone name (e.g. "Asia/Kolkata"). For role='dietitian' this is also the wall-clock frame
  -- `dietitian_weekly_hours`/exceptions/`consultation_schedules.preferred_time` are interpreted in
  -- (see availability.js's module comment); for any role it's simply "what zone to render this
  -- user's own times in" (dashboards, call cards, notification emails — see timezoneService.js).
  -- Defaults to 'UTC', never a guessed real zone, so introducing this column is non-breaking: a
  -- user who hasn't set their real timezone yet keeps exactly the pre-timezone comparison behavior
  -- (UTC-as-local) rather than being silently relocated.
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  -- ISO 3166-1 alpha-2 (e.g. "US", "IN") — display/preference only, never used to derive timezone
  -- (a country spans many zones). Matches the two-letter convention already established by
  -- libphonenumber-js's country codes elsewhere in this codebase. No reliable signal to backfill
  -- from, so nullable rather than guessed.
  country CHAR(2) NULL,
  -- A literal date-fns format token string (see client/src/lib/format.js), not an enum + a
  -- server-side mapping table — the client feeds this straight into `format()`. Default reproduces
  -- format.js's pre-existing hard-coded output exactly, so no existing user's display changes
  -- until they explicitly opt into a different pattern.
  date_format VARCHAR(20) NOT NULL DEFAULT 'MMM d, yyyy',
  -- Only two real values ever mattered (12-hour with AM/PM, or 24-hour) — ENUM makes that
  -- constraint visible at the schema level instead of relying on application code. Default matches
  -- the AM/PM formatting format.js has always hard-coded.
  time_format ENUM('12h', '24h') NOT NULL DEFAULT '12h',
  -- Identity of this user's ZenX customer-portal account (admin-server's zenx_users.id), set the
  -- first time they arrive via SSO handoff — see auth.controller.js#handoff. NULL for any user
  -- created directly in this app (the normal admin-creates-a-dietitian/client flow). Looked up
  -- before email, since a ZenX-side email change must not orphan the link.
  zenx_user_id VARCHAR(36) NULL,
  -- company_id/company_slug (2026-08-27, multi-tenancy): the ZenX company (admin-server's
  -- companies.id/company_slug) this user's org is. Set from the handoff token's own company_id/
  -- company_slug claims (auth.controller.js#handoff) for an SSO-linked account, or copied from the
  -- creating admin's own companyId for a user created directly inside this app
  -- (user.controller.js#createUser) — never client-settable. NOT NULL here (fresh installs only);
  -- see the program_plans comment above for why migrate.js's ALTER keeps it nullable on an
  -- existing database. No FK: cross-service id, same trust model as zenx_user_id.
  company_id VARCHAR(36) NOT NULL,
  company_slug VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_zenx_user (zenx_user_id),
  KEY idx_users_role (role),
  KEY idx_users_assigned_dietitian (assigned_dietitian_id),
  KEY idx_users_program_plan (program_plan_id),
  KEY idx_users_company (company_id),
  CONSTRAINT fk_users_assigned_dietitian FOREIGN KEY (assigned_dietitian_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_users_program_plan FOREIGN KEY (program_plan_id) REFERENCES program_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- company_id (2026-08-27, multi-tenancy): which org's public "book a consultation" funnel this
-- lead came through — see enquiry.controller.js#createEnquiry (defaults to the legacy company for
-- the one existing funnel; a real per-company public funnel is a future addition). NOT NULL here
-- (fresh installs only) — see the program_plans comment above for the asymmetric-backfill pattern.
CREATE TABLE IF NOT EXISTS enquiries (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  goal VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  preferred_slot VARCHAR(255),
  -- Always the LATEST note/reason (set on every status change) — the full append-only history
  -- lives in enquiry_history below, added once `calls` exists (a history row can reference one).
  note TEXT,
  status ENUM('new', 'contacted', 'follow-up', 'converted', 'closed') NOT NULL DEFAULT 'new',
  -- Set the first time this lead gets a real client account — either via "Follow-up" (which also
  -- books a call) or "Converted" (account only). Lets a later transition know one already exists
  -- instead of creating a duplicate. NULL until then. FK added after `users` — already defined
  -- above — so this can reference it directly.
  converted_user_id VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_enquiries_status (status),
  KEY idx_enquiries_created_at (created_at),
  KEY idx_enquiries_converted_user (converted_user_id),
  KEY idx_enquiries_company (company_id),
  CONSTRAINT fk_enquiries_converted_user FOREIGN KEY (converted_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recipes (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  emoji VARCHAR(16) NOT NULL DEFAULT '🍽️',
  -- Free text, not an ENUM (2026-08-22) — the Create Recipe form offers Breakfast/Lunch/Dinner/
  -- Snack plus a "Custom" option that reveals a text input; whatever the dietitian types is saved
  -- here as-is. Safe to relax from the original 4-value ENUM: confirmed the weekly plan builder
  -- never compares a recipe's meal_type to a plan_meals slot's own meal_type (that stays a fixed
  -- enum below, an independent concept — see the plan_meals comment).
  meal_type VARCHAR(50) NOT NULL,
  prep_time VARCHAR(100) NOT NULL,
  kcal INT NULL,
  protein INT NULL,
  ingredients TEXT NOT NULL,
  instructions TEXT NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_recipes_meal_type (meal_type),
  CONSTRAINT fk_recipes_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recipe_tags (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  recipe_id VARCHAR(36) NOT NULL,
  tag VARCHAR(100) NOT NULL,
  KEY idx_recipe_tags_recipe (recipe_id),
  CONSTRAINT fk_recipe_tags_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  dietitian_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Weekly nourish plan',
  week DATE NOT NULL,
  week_end DATE NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_plans_client (client_id),
  KEY idx_plans_dietitian (dietitian_id),
  KEY idx_plans_week (week),
  KEY idx_plans_week_end (week_end),
  CONSTRAINT fk_plans_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_plans_dietitian FOREIGN KEY (dietitian_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- `idx` preserves array position: plan.controller.js#updateMealStatus and the client's
-- plan.meals.indexOf(meal) both address a meal by its position in the array, so meals are always
-- read back ORDER BY idx. No id is exposed on meal rows in JSON (the original mealSlotSchema had
-- `{ _id: false }`, and the client never reads meal._id).
-- `meal_type` (spec §2026-round2-fixes item 4): relaxed from a fixed 4-value ENUM to free text,
-- same convention already used for recipes.meal_type — the plan builder's dropdown still offers
-- exactly the 4 fixed values plus a 'Custom' UI-only sentinel that reveals a free-text input; the
-- typed name is what's actually saved here, and whether a saved meal is "custom" is derived by
-- membership in the fixed list, not a separate flag. `recipe_id`/`custom_title` are mutually
-- exclusive (never both set — a slot references a catalog recipe OR a manually typed one, or
-- neither if the slot hasn't been filled in yet), enforced below by trigger, not just in
-- application code. This can't be a CHECK constraint: MySQL rejects a CHECK on a column that
-- also carries an FK with a SET NULL/CASCADE/SET DEFAULT referential action (errno 3823), and
-- fk_plan_meals_recipe below is ON DELETE SET NULL — see the trigger pair after this table.
CREATE TABLE IF NOT EXISTS plan_meals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  plan_id VARCHAR(36) NOT NULL,
  idx INT NOT NULL,
  day VARCHAR(20) NOT NULL,
  time VARCHAR(20) NOT NULL,
  meal_type VARCHAR(50) NOT NULL,
  recipe_id VARCHAR(36) NULL,
  custom_title VARCHAR(255) NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  swap_requested BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NULL,
  KEY idx_plan_meals_plan (plan_id, idx),
  KEY idx_plan_meals_recipe (recipe_id),
  CONSTRAINT fk_plan_meals_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_plan_meals_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Runs unconditionally on every migrate.js invocation (this whole file does — see migrate.js),
-- so DROP-then-CREATE is what makes it idempotent, matching CREATE TABLE IF NOT EXISTS above.
-- recipe_id's own ON DELETE SET NULL action can never trip this: it only ever clears recipe_id,
-- which makes the guard's condition MORE false, never less.
DROP TRIGGER IF EXISTS trg_plan_meals_recipe_xor_custom_insert;
CREATE TRIGGER trg_plan_meals_recipe_xor_custom_insert BEFORE INSERT ON plan_meals FOR EACH ROW
BEGIN
  IF NEW.recipe_id IS NOT NULL AND NEW.custom_title IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'plan_meals: recipe_id and custom_title are mutually exclusive';
  END IF;
END;

DROP TRIGGER IF EXISTS trg_plan_meals_recipe_xor_custom_update;
CREATE TRIGGER trg_plan_meals_recipe_xor_custom_update BEFORE UPDATE ON plan_meals FOR EACH ROW
BEGIN
  IF NEW.recipe_id IS NOT NULL AND NEW.custom_title IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'plan_meals: recipe_id and custom_title are mutually exclusive';
  END IF;
END;

-- `reminder_minutes_before` (minutes, or NULL for none) drives the client's in-app pop-up
-- reminder — see client/src/hooks/useCallReminders.js.
-- Recurring "consultation schedule" per client — one row per client (uq_consultation_schedules_client),
-- not loose fields on `users`, so the recurrence config has its own identity that `calls` rows can
-- point back to (consultation_schedule_id below). The dietitian is deliberately NOT stored here —
-- always read live from `users.assigned_dietitian_id` at generation/validation time, so reassigning
-- a client to a different dietitian is picked up automatically instead of leaving a stale reference.
-- `frequency_days` collapses the UI's "Every 7 days / Every 14 days / Custom N days" into one
-- integer — there's no separate "which preset" column, the UI derives the preset from the value.
-- `preferred_weekday` matches `dietitian_weekly_hours.weekday`'s exact convention (0=Sunday, JS
-- Date#getUTCDay()); `preferred_time` is wall-clock in the dietitian's own timezone, same
-- convention as `dietitian_weekly_hours.start_time`/`end_time` — not a raw UTC time.
-- `active` is the paused flag (FALSE = paused): a paused schedule never generates new occurrences,
-- but never touches calls already booked from it either (see server/src/services/
-- consultationScheduleService.js — every change to already-booked future calls is an explicit,
-- asked-for action, never an automatic side effect of pausing or editing).
CREATE TABLE IF NOT EXISTS consultation_schedules (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  frequency_days INT NOT NULL,
  preferred_weekday TINYINT NOT NULL,
  preferred_time TIME NOT NULL,
  start_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_consultation_schedules_client (client_id),
  CONSTRAINT fk_consultation_schedules_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per occurrence the rolling-window generator (server/src/services/
-- consultationScheduleService.js#generateForSchedule) could NOT place — a real scheduling conflict
-- (blocked/outside hours/overlap) on that specific date, flagged for a human to resolve rather than
-- silently skipped or silently rescheduled to a different time. `occurrence_at` is the originally
-- INTENDED instant (same "occurrence identity" concept as calls' own
-- COALESCE(original_scheduled_at, scheduled_at) — see the generator's own comment) — this is what
-- makes generation idempotent for a date that keeps failing: it's flagged once, not once per job run.
CREATE TABLE IF NOT EXISTS consultation_schedule_gaps (
  id VARCHAR(36) PRIMARY KEY,
  consultation_schedule_id VARCHAR(36) NOT NULL,
  occurrence_at DATETIME(3) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_consultation_schedule_gaps_schedule (consultation_schedule_id, occurrence_at),
  CONSTRAINT fk_consultation_schedule_gaps_schedule FOREIGN KEY (consultation_schedule_id) REFERENCES consultation_schedules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS calls (
  id VARCHAR(36) PRIMARY KEY,
  -- Exactly one of client_id/enquiry_id is ever set (see chk_calls_client_xor_enquiry below) — a
  -- call is either with a real client account or, before conversion, with a lead that only exists
  -- as an enquiry (spec §2026-round2-fixes item 1: Follow-up must not force-create an account).
  -- Nullable specifically so an enquiry-linked call is never forced to carry a fake/placeholder
  -- client id — see enquiry.controller.js for how a call is re-pointed from enquiry_id to
  -- client_id once (and only once) the lead is actually marked Converted.
  client_id VARCHAR(36) NULL,
  enquiry_id VARCHAR(36) NULL,
  dietitian_id VARCHAR(36) NOT NULL,
  scheduled_at DATETIME(3) NOT NULL,
  status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  reminder_minutes_before INT NULL,
  -- The iCalendar SEQUENCE for this appointment's invite (server/src/emails/ics.js). Starts at 0 on
  -- booking; incremented on every reschedule and again on cancellation, alongside the same
  -- deterministic UID (`call-<id>@nourishly.app`, derived from this row's own id, never stored) —
  -- so a calendar client recognizes a reschedule/cancel as an update to the one event it already
  -- has instead of creating a second one.
  ics_sequence INT NOT NULL DEFAULT 0,
  -- Set only for a call generated by consultation_schedules (server/src/services/
  -- consultationScheduleService.js#generateOccurrences) — NULL for every ad-hoc, manually booked
  -- call. This is what lets "the upcoming calls this schedule already produced" be queried as a
  -- real, inspectable set (the exact capability the old, removed "Repeat Call" feature never had —
  -- see the 2026-08-22 removal in docs/worklog/). ON DELETE SET NULL, not CASCADE: a schedule being
  -- removed must never delete a real, already-booked/already-notified call — it just stops being
  -- attributed to that schedule.
  consultation_schedule_id VARCHAR(36) NULL,
  -- Set the first time a still-`scheduled` call's `scheduled_at` changes (see call.controller.js#updateCall)
  -- so the client profile's call history can show a "Rescheduled" badge and the original time — a
  -- reschedule updates this same row in place rather than creating a new one, so without these two
  -- columns the fact "this call used to be at a different time" would be lost entirely.
  original_scheduled_at DATETIME(3) NULL,
  rescheduled_at DATETIME(3) NULL,
  -- Set by reminderScheduler.js the moment it enqueues this call's reminder emails — the dedupe
  -- flag that keeps a poller restart or a slow tick from sending the same reminder twice. NULL
  -- means "not sent yet" (or reminder_minutes_before is NULL, in which case it's never touched).
  reminder_sent_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_calls_client (client_id),
  KEY idx_calls_enquiry (enquiry_id),
  KEY idx_calls_dietitian (dietitian_id),
  KEY idx_calls_scheduled_at (scheduled_at),
  -- Lets the availability guard's `SELECT ... FOR UPDATE` range query (Call.js#lockOverlappingCalls)
  -- use a tight index range scan on (dietitian_id, scheduled_at) instead of falling back to
  -- idx_calls_dietitian alone, which would gap-lock every row for that dietitian regardless of
  -- scheduled_at — verified via EXPLAIN to cause real lock contention between unrelated bookings.
  KEY idx_calls_dietitian_scheduled (dietitian_id, scheduled_at),
  KEY idx_calls_consultation_schedule (consultation_schedule_id),
  CONSTRAINT fk_calls_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_calls_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE,
  CONSTRAINT fk_calls_dietitian FOREIGN KEY (dietitian_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_calls_consultation_schedule FOREIGN KEY (consultation_schedule_id) REFERENCES consultation_schedules(id) ON DELETE SET NULL,
  CONSTRAINT chk_calls_client_xor_enquiry CHECK ((client_id IS NULL) <> (enquiry_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Append-only audit log: one row per status change, never overwritten or edited. `call_id` is
-- only ever set for a 'follow-up' entry that scheduled a real call — lets the pipeline UI show
-- "call booked" and link straight to it. No updated_at (matches report_feedback's existing
-- createdAt-only immutable-log pattern).
CREATE TABLE IF NOT EXISTS enquiry_history (
  id VARCHAR(36) PRIMARY KEY,
  enquiry_id VARCHAR(36) NOT NULL,
  status ENUM('new', 'contacted', 'follow-up', 'converted', 'closed') NOT NULL,
  note TEXT NULL,
  call_id VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_enquiry_history_enquiry (enquiry_id, created_at),
  CONSTRAINT fk_enquiry_history_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE,
  CONSTRAINT fk_enquiry_history_call FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS progress (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  weight DECIMAL(6, 2) NOT NULL,
  waist DECIMAL(6, 2) NULL,
  hip DECIMAL(6, 2) NULL,
  thigh DECIMAL(6, 2) NULL,
  upper_arm DECIMAL(6, 2) NULL,
  energy TINYINT NULL,
  adherence TINYINT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_progress_client (client_id),
  KEY idx_progress_date (date),
  CONSTRAINT fk_progress_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  note TEXT,
  status ENUM('pending', 'reviewed') NOT NULL DEFAULT 'pending',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_reports_client (client_id),
  CONSTRAINT fk_reports_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- General client notes (spec §6, item 6) — deliberately separate from `calls.notes` (tied to one
-- specific call) and `reports.note` (tied to one specific report upload): this is free-standing
-- context about the client that isn't attached to any other record. Author-editable, admin can
-- edit/delete any note — see clientNote.controller.js.
CREATE TABLE IF NOT EXISTS client_notes (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_client_notes_client (client_id),
  CONSTRAINT fk_client_notes_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_client_notes_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Client <-> assigned dietitian messaging (spec §1.5). Conversation identity is the
-- (client_id, dietitian_id) pair itself — no separate `conversations` row — and access control is
-- always re-derived from the *current* `users.assigned_dietitian_id` at request time (see
-- message.controller.js#resolveConversation), never trusted from a message row. So if a client is
-- reassigned to a different dietitian, their old thread becomes read-only history neither the old
-- nor new dietitian (nor the client, for that matter, since resolveConversation always uses the
-- client's *current* assignment) can address further — consistent with "a user must never read or
-- post to a conversation they aren't part of" applying to the present, not a point-in-time record.
-- `read_at` is a single column (not per-party) because each message has exactly one recipient in a
-- 1:1 thread — the sender never needs to "read" their own message.
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  dietitian_id VARCHAR(36) NOT NULL,
  sender_id VARCHAR(36) NOT NULL,
  body TEXT NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  -- Covers both "give me this conversation in order" and the dietitian conversation list's
  -- per-client latest-message/unread lookups.
  KEY idx_messages_conversation (client_id, dietitian_id, created_at),
  KEY idx_messages_dietitian_unread (dietitian_id, client_id, read_at),
  CONSTRAINT fk_messages_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_dietitian FOREIGN KEY (dietitian_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- id stays a real VARCHAR(36) (unlike plan_meals) because the client uses entry._id as a React
-- key (ReportCard.jsx, DietitianReportCard.jsx). createdAt-only, no updatedAt — matches the
-- original { timestamps: { createdAt: true, updatedAt: false } }.
CREATE TABLE IF NOT EXISTS report_feedback (
  id VARCHAR(36) PRIMARY KEY,
  report_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_report_feedback_report (report_id),
  CONSTRAINT fk_report_feedback_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_feedback_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Only `token_hash` (SHA-256 of the emailed token) is ever stored — never the plaintext token —
-- same principle as password_hash. `used_at` is set the moment a reset succeeds so the same link
-- can't be replayed even if it hasn't expired yet.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_password_reset_tokens_hash (token_hash),
  KEY idx_password_reset_tokens_user (user_id),
  CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notification engine foundation: doubles as both the send queue and the audit log (one row per
-- sendEmail() call, from queued through its final sent/failed state — see server/src/emails/).
-- `params` (the render inputs, not the rendered body) is persisted so the worker can re-render and
-- retry after a process restart without the caller keeping anything in memory.
-- `related_entity_type`/`related_entity_id` is a polymorphic reference (client/appointment/enquiry)
-- with no FK, since a single column pair can't target three different tables.
CREATE TABLE IF NOT EXISTS email_log (
  id VARCHAR(36) PRIMARY KEY,
  idempotency_key VARCHAR(191) NOT NULL,
  to_email VARCHAR(255) NOT NULL,
  template_key VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NULL,
  params JSON NOT NULL,
  related_entity_type ENUM('client', 'appointment', 'enquiry') NULL,
  related_entity_id VARCHAR(36) NULL,
  status ENUM('queued', 'sending', 'sent', 'failed') NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  next_attempt_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  provider_message_id VARCHAR(255) NULL,
  error TEXT NULL,
  sent_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_email_log_idempotency (idempotency_key),
  KEY idx_email_log_status_next_attempt (status, next_attempt_at),
  KEY idx_email_log_related (related_entity_type, related_entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A dietitian's recurring weekly template. One row per open weekday; a weekday with no row is
-- closed by default. If a dietitian has configured NO rows at all (true for every dietitian
-- before this feature shipped), the availability service treats them as unrestricted rather than
-- closed-all-week — see server/src/services/availability.js — so this table is opt-in and never
-- retroactively locks out an existing dietitian, matching the same principle already used for
-- users.must_change_password.
CREATE TABLE IF NOT EXISTS dietitian_weekly_hours (
  id VARCHAR(36) PRIMARY KEY,
  dietitian_id VARCHAR(36) NOT NULL,
  weekday TINYINT NOT NULL,        -- 0=Sunday..6=Saturday, matches JS Date#getUTCDay()
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_weekly_hours_dietitian_weekday (dietitian_id, weekday),
  CONSTRAINT fk_weekly_hours_dietitian FOREIGN KEY (dietitian_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Single generalized mechanism for every deviation from the weekly template: kind='closed' blocks
-- a range (a single date, a lunch-break time window, or a multi-day holiday/personal period are
-- all just the same shape at different spans); kind='open' grants time outside/instead of the
-- template (e.g. working hours on a normally-closed date). No update endpoint — the UI deletes and
-- recreates a row instead of editing one in place.
CREATE TABLE IF NOT EXISTS dietitian_availability_exceptions (
  id VARCHAR(36) PRIMARY KEY,
  dietitian_id VARCHAR(36) NOT NULL,
  start_at DATETIME(3) NOT NULL,
  end_at DATETIME(3) NOT NULL,
  kind ENUM('closed', 'open') NOT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_exceptions_dietitian_range (dietitian_id, start_at, end_at),
  CONSTRAINT fk_exceptions_dietitian FOREIGN KEY (dietitian_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-dietitian Google OAuth grant, for creating Calendar events with a Google Meet room attached
-- (services/googleMeet.js). One row per connected user; disconnecting deletes the row rather than
-- blanking it, so "connected?" is a plain existence check.
--
-- Only the refresh token is durable — access tokens are short-lived and re-minted on demand, so a
-- stale/absent one is never an error. Both are stored as-is: this is the same trust boundary as
-- users.password_hash's row, and encrypting them would need a key management story this app does
-- not have yet (noted in docs/worklog 2026-08-29 as follow-up).
--
-- ON DELETE CASCADE: a deleted user must not leave a live grant against their Google account.
CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  user_id VARCHAR(36) PRIMARY KEY,
  google_email VARCHAR(255) NULL,
  refresh_token TEXT NOT NULL,
  access_token TEXT NULL,
  access_token_expires_at DATETIME(3) NULL,
  scope TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_google_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
