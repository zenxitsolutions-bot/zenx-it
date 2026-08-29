-- ZenX Admin Portal — core schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.
-- Pairs with rls.sql (run after this) and seed.sql (optional, demo data).

create extension if not exists "pgcrypto";

-- 2026-08-25: cutover from the old customer/customer_applications identity model (below) to
-- companies/users/application_access. Nothing real has ever been deployed against this schema
-- (this project has only ever run in the app's local demo mode), so this is a clean drop, not a
-- data migration — safe to re-run against a fresh project or one that had the old schema applied.
drop view if exists customer_applications_public;
drop table if exists customer_applications;
drop table if exists customers;

-- Defined up front (moved ahead of the table/trigger definitions below that
-- use it — companies/users/application_access all keep updated_at current
-- the same way enquiries always has).
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- profiles — one row per admin portal user, linked 1:1 to auth.users
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  role text not null check (role in ('Super Admin', 'Admin', 'Sales', 'Support')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- enquiries — every website / manual lead
-- ---------------------------------------------------------------------------
create table if not exists enquiries (
  id text primary key default gen_random_uuid()::text,
  company_name text not null,
  contact_name text not null,
  phone text not null,
  email text not null,
  website text,
  service text not null check (
    service in ('Website', 'Digital Marketing', 'Business Software', 'Small Business POS', 'ZenX Dietitian application', 'Something else')
  ),
  source text not null check (
    source in ('Website', 'Google', 'Facebook', 'Instagram', 'Referral', 'Direct', 'Other')
  ),
  status text not null default 'NEW' check (
    status in ('NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'LOST')
  ),
  priority text not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH', 'HOT')),
  assigned_to uuid references profiles (id) on delete set null,
  estimated_value numeric,
  -- Address + free-text notes (2026-08-25 — manual-enquiry spec): all optional since the public
  -- website contact form only ever supplies company/contact/phone/email/website/service/source.
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  converted_at timestamptz,
  lost_at timestamptz
);

create index if not exists enquiries_status_idx on enquiries (status);
create index if not exists enquiries_assigned_to_idx on enquiries (assigned_to);
create index if not exists enquiries_created_at_idx on enquiries (created_at desc);

-- ---------------------------------------------------------------------------
-- interactions — the conversation timeline
-- ---------------------------------------------------------------------------
create table if not exists interactions (
  id text primary key default gen_random_uuid()::text,
  enquiry_id text not null references enquiries (id) on delete cascade,
  admin_id uuid not null references profiles (id),
  contact_type text not null check (
    contact_type in ('Phone Call', 'Email', 'WhatsApp', 'Meeting', 'Video Call', 'Other')
  ),
  comment text not null,
  outcome text not null check (
    outcome in ('Interested', 'Needs More Information', 'Not Interested', 'Call Again', 'Proposal Requested', 'Ready to Convert', 'Other')
  ),
  next_action text,
  created_at timestamptz not null default now()
);

create index if not exists interactions_enquiry_id_idx on interactions (enquiry_id);

-- ---------------------------------------------------------------------------
-- followups — scheduled contact
-- ---------------------------------------------------------------------------
create table if not exists followups (
  id text primary key default gen_random_uuid()::text,
  enquiry_id text not null references enquiries (id) on delete cascade,
  assigned_to uuid references profiles (id) on delete set null,
  scheduled_date date not null,
  scheduled_time time not null,
  contact_method text not null check (
    contact_method in ('Phone Call', 'Email', 'WhatsApp', 'Meeting', 'Video Call', 'Other')
  ),
  notes text,
  reminder text not null default 'None' check (
    reminder in ('None', '15 minutes before', '30 minutes before', '1 hour before', '1 day before')
  ),
  status text not null default 'SCHEDULED' check (
    status in ('SCHEDULED', 'COMPLETED', 'OVERDUE', 'RESCHEDULED', 'CANCELLED')
  ),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists followups_enquiry_id_idx on followups (enquiry_id);
create index if not exists followups_scheduled_date_idx on followups (scheduled_date);

-- ---------------------------------------------------------------------------
-- companies — customer businesses. The permanent tenant identifier
-- (company_id = this row's id) is what wellness-app/POS use for isolation;
-- company_slug is routing/display only, never an authorization check.
-- ---------------------------------------------------------------------------
create table if not exists companies (
  id text primary key default gen_random_uuid()::text,
  enquiry_id text references enquiries (id) on delete set null,
  company_name text not null,
  company_slug text not null unique,
  company_email text,
  company_phone text,
  website text,
  logo_url text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  country text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_slug_idx on companies (company_slug);

drop trigger if exists companies_set_updated_at on companies;
create trigger companies_set_updated_at
  before update on companies
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- users — the permanent zenx_user_id identity (this row's id = auth.users.id)
-- shared across every ZenX-sold application. Distinct from `profiles`, which
-- is ZenX's own internal staff (Super Admin/Admin/Sales/Support) — a
-- customer's people are never rows in `profiles`. Email is a contact/login
-- attribute only; a user's permanent relationship to a company is the
-- application_access row below, never their email address.
-- ---------------------------------------------------------------------------
create table if not exists users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  phone text,
  job_title text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  -- True whenever an admin set this person's password directly (creation or a Reset Password
  -- action) rather than the person choosing it themselves — cleared by the customer-facing
  -- change-password screen once they pick their own. The password itself is never stored here or
  -- anywhere else in this schema; only Supabase Auth holds it, hashed.
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login timestamptz
);

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- applications — the ZenX products (seeded, see seed.sql). `slug` is not
-- constrained to a fixed list so future applications can be added without a
-- migration. `url`/`handoff_secret` are per-APPLICATION, not per-grant: each
-- application is one shared deployment serving every company (companies are
-- distinguished by company_id inside that deployment, not by which
-- deployment they hit) — see issue-app-handoff, which signs a token with
-- this row's secret and points the redirect at this row's url.
-- ---------------------------------------------------------------------------
create table if not exists applications (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  slug text not null unique,
  description text not null,
  url text,
  -- Service-role only — never selectable by customers or admins directly (no policy below grants
  -- non-admin select on this column, and there's no public/customer-facing view of `applications`
  -- that would leak it).
  handoff_secret text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- application_access — per-user, per-company, per-application grant + role.
-- This (not email, not company name) is the permanent relationship between a
-- person, a company, and an application. `application` matches an
-- `applications.slug` value; role is application-specific (e.g.
-- 'wellness_admin'/'dietitian'/'client' for wellness, left open for future
-- apps rather than a fixed enum).
-- ---------------------------------------------------------------------------
create table if not exists application_access (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references users (id) on delete cascade,
  company_id text not null references companies (id) on delete cascade,
  application text not null references applications (slug),
  role text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  activated_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id, application)
);

create index if not exists application_access_company_idx on application_access (company_id);
create index if not exists application_access_user_idx on application_access (user_id);

drop trigger if exists application_access_set_updated_at on application_access;
create trigger application_access_set_updated_at
  before update on application_access
  for each row execute function set_updated_at();

-- application_access_public — a customer-safe view of the above (all columns
-- except handoff_secret, filtered to the caller's own rows) — see rls.sql,
-- defined there since its whole purpose is the security filter.

-- ---------------------------------------------------------------------------
-- audit_logs — who did what
-- ---------------------------------------------------------------------------
create table if not exists audit_logs (
  id text primary key default gen_random_uuid()::text,
  admin_id uuid not null references profiles (id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- notifications — admin notification bell
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id text primary key default gen_random_uuid()::text,
  kind text not null check (
    kind in ('NEW_ENQUIRY', 'FOLLOWUP_DUE', 'FOLLOWUP_OVERDUE', 'CONVERTED', 'APPLICATION_CREATED')
  ),
  title text not null,
  body text not null,
  entity_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- keep enquiries.updated_at current on every write (set_updated_at defined near the top of this file)
drop trigger if exists enquiries_set_updated_at on enquiries;
create trigger enquiries_set_updated_at
  before update on enquiries
  for each row execute function set_updated_at();
