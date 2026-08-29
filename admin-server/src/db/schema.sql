-- ZenX Admin Portal — MySQL schema (replaces the former Supabase/Postgres schema.sql).
-- Every id is a VARCHAR(36) app-generated UUID (see src/db/id.js), matching wellness-app's own
-- convention — plain string comparisons everywhere, no DB-generated ids.
-- `updated_at` uses MySQL's native `ON UPDATE CURRENT_TIMESTAMP(3)` in place of Postgres's
-- set_updated_at() trigger — same effect, no trigger needed.

CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Super Admin', 'Admin', 'Sales', 'Support') NOT NULL,
  status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
  -- IANA zone name — what zone this staff member's own times (follow-ups they're assigned,
  -- dashboards) render in. Defaults to 'UTC', never a guessed real zone, matching wellness-app's
  -- own users.timezone convention (see that schema.sql's comment) so introducing this column is
  -- non-breaking.
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  -- ISO 3166-1 alpha-2 — display/preference only, never used to derive timezone.
  country CHAR(2) NULL,
  -- A literal date-fns format token string (see admin/src/lib/timezone.ts) fed straight into the
  -- formatter. Default reproduces admin/src/utils/date.ts's pre-existing hard-coded output.
  date_format VARCHAR(20) NOT NULL DEFAULT 'MMM d, yyyy',
  time_format ENUM('12h', '24h') NOT NULL DEFAULT '12h',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_profiles_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS enquiries (
  id VARCHAR(36) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  website VARCHAR(1024) NULL,
  service ENUM('Website', 'Digital Marketing', 'Business Software', 'Small Business POS', 'ZenX Dietitian application', 'Something else') NOT NULL,
  source ENUM('Website', 'Google', 'Facebook', 'Instagram', 'Referral', 'Direct', 'Other') NOT NULL,
  status ENUM('NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'LOST') NOT NULL DEFAULT 'NEW',
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'HOT') NOT NULL DEFAULT 'MEDIUM',
  assigned_to VARCHAR(36) NULL,
  estimated_value DECIMAL(12, 2) NULL,
  address_line1 VARCHAR(255) NULL,
  address_line2 VARCHAR(255) NULL,
  city VARCHAR(120) NULL,
  state VARCHAR(120) NULL,
  zip VARCHAR(20) NULL,
  country VARCHAR(120) NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  converted_at DATETIME(3) NULL,
  lost_at DATETIME(3) NULL,
  KEY idx_enquiries_status (status),
  KEY idx_enquiries_assigned_to (assigned_to),
  KEY idx_enquiries_created_at (created_at),
  CONSTRAINT fk_enquiries_assigned_to FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS interactions (
  id VARCHAR(36) PRIMARY KEY,
  enquiry_id VARCHAR(36) NOT NULL,
  admin_id VARCHAR(36) NOT NULL,
  contact_type ENUM('Phone Call', 'Email', 'WhatsApp', 'Meeting', 'Video Call', 'Other') NOT NULL,
  comment TEXT NOT NULL,
  outcome ENUM('Interested', 'Needs More Information', 'Not Interested', 'Call Again', 'Proposal Requested', 'Ready to Convert', 'Other') NOT NULL,
  next_action VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_interactions_enquiry (enquiry_id),
  CONSTRAINT fk_interactions_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE,
  CONSTRAINT fk_interactions_admin FOREIGN KEY (admin_id) REFERENCES profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS followups (
  id VARCHAR(36) PRIMARY KEY,
  enquiry_id VARCHAR(36) NOT NULL,
  assigned_to VARCHAR(36) NULL,
  -- scheduled_date/scheduled_time are the ORIGINAL wall-clock a staff member typed — kept exactly
  -- as-is (never dropped) as the literal record of what was entered. scheduled_at_utc/timezone
  -- below are the real, timezone-aware source of truth every query/display/reminder actually uses.
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  -- The real UTC instant scheduled_date+scheduled_time represents in `timezone` — see
  -- models/Followup.js's wallClockToUtc computation. NOT NULL on a fresh install; the migrate.js
  -- ALTER adds it nullable and backfills existing rows before any code relies on it being set.
  scheduled_at_utc DATETIME(3) NOT NULL,
  -- The IANA zone scheduled_date/scheduled_time are wall-clock IN. Existing rows predating this
  -- column never had any timezone concept at all (captured via a raw browser date/time input,
  -- redisplayed via naive browser-local parsing — no UTC conversion anywhere in that round-trip),
  -- so there is no way to algorithmically recover what zone a historical row was really meant in.
  -- 'UTC' here for a backfilled row is an explicitly-flagged neutral placeholder, not a guess — see
  -- migrate.js's backfill UPDATE and FollowupsPage.tsx's "unverified timezone" banner for rows still
  -- carrying it. A NEW row (created after this column existed) always gets a real, deliberately
  -- chosen zone — see followup.schema.js, where timezone is required on create, not defaulted.
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  contact_method ENUM('Phone Call', 'Email', 'WhatsApp', 'Meeting', 'Video Call', 'Other') NOT NULL,
  notes TEXT NULL,
  reminder ENUM('None', '15 minutes before', '30 minutes before', '1 hour before', '1 day before') NOT NULL DEFAULT 'None',
  status ENUM('SCHEDULED', 'COMPLETED', 'OVERDUE', 'RESCHEDULED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  completed_at DATETIME(3) NULL,
  -- Dedupe flag for reminderScheduler.js — set the moment its reminder/overdue notification is
  -- enqueued, so a poller restart or a slow tick never double-fires the same notification.
  reminder_sent_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_followups_enquiry (enquiry_id),
  KEY idx_followups_scheduled_date (scheduled_date),
  KEY idx_followups_scheduled_at_utc (scheduled_at_utc),
  CONSTRAINT fk_followups_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE,
  CONSTRAINT fk_followups_assigned_to FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(36) PRIMARY KEY,
  enquiry_id VARCHAR(36) NULL,
  company_name VARCHAR(255) NOT NULL,
  company_slug VARCHAR(255) NOT NULL,
  company_email VARCHAR(255) NULL,
  company_phone VARCHAR(50) NULL,
  website VARCHAR(1024) NULL,
  logo_url VARCHAR(1024) NULL,
  address_line1 VARCHAR(255) NULL,
  address_line2 VARCHAR(255) NULL,
  city VARCHAR(120) NULL,
  state VARCHAR(120) NULL,
  zip VARCHAR(20) NULL,
  country VARCHAR(120) NULL,
  -- "Company timezone" viewing option (admin can view a schedule in "My / Their / Company"
  -- timezone — see TimezoneToggle.tsx). Nullable, not guessed: this table's own `country` is
  -- free-text and has never been used to derive a timezone, so there's no reliable existing signal
  -- to backfill from — a company only gets one once someone explicitly sets it.
  timezone VARCHAR(64) NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_companies_slug (company_slug),
  CONSTRAINT fk_companies_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The customer identity (a company's contact person) — distinct from `profiles` (ZenX's own
-- staff). No `references auth.users`: there is no Supabase Auth here, `password_hash` lives
-- directly on this row instead.
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  job_title VARCHAR(255) NULL,
  status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  -- Same four preference fields as profiles above — req. item 17's "client/subusers" timezone.
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  country CHAR(2) NULL,
  date_format VARCHAR(20) NOT NULL DEFAULT 'MMM d, yyyy',
  time_format ENUM('12h', '24h') NOT NULL DEFAULT '12h',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_login DATETIME(3) NULL,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The ZenX products (seeded — see seed.js). url/handoff_secret are per-application, shared by
-- every company that uses it — see issue-app-handoff in customerAuth.controller.js.
CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  url VARCHAR(1024) NULL,
  handoff_secret VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_applications_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS application_access (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  company_id VARCHAR(36) NOT NULL,
  application VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
  activated_at DATETIME(3) NULL,
  deactivated_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_application_access (user_id, company_id, application),
  KEY idx_application_access_company (company_id),
  KEY idx_application_access_user (user_id),
  CONSTRAINT fk_application_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_application_access_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_application_access_application FOREIGN KEY (application) REFERENCES applications(slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  admin_id VARCHAR(36) NOT NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  description TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_audit_logs_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_logs_admin FOREIGN KEY (admin_id) REFERENCES profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  kind ENUM('NEW_ENQUIRY', 'FOLLOWUP_DUE', 'FOLLOWUP_OVERDUE', 'CONVERTED', 'APPLICATION_CREATED') NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  entity_id VARCHAR(36) NULL,
  `read` BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Staff (profiles) and customer (users) password-reset / invite tokens — the primitive Supabase
-- Auth's inviteUserByEmail/resetPasswordForEmail provided for free and now must be reimplemented
-- (see admin-server/src/controllers/adminUsers.controller.js#invite and
-- customerAuth.controller.js#forgotPassword).
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY,
  account_kind ENUM('staff', 'customer') NOT NULL,
  account_id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_password_reset_tokens_account (account_kind, account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
