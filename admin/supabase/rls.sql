-- ZenX Admin Portal — Row Level Security
-- Run after schema.sql. Assumes Supabase Auth (auth.users) backs every admin in `profiles`.

alter table profiles enable row level security;
alter table enquiries enable row level security;
alter table interactions enable row level security;
alter table followups enable row level security;
alter table companies enable row level security;
alter table users enable row level security;
alter table applications enable row level security;
alter table application_access enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and status = 'ACTIVE'
  );
$$;

create or replace function current_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_active_admin() and current_admin_role() in ('Super Admin', 'Admin');
$$;

-- security definer so this bypasses application_access's own RLS (which only grants admins a
-- row directly) — without this, companies_member_select's subquery below would see zero rows for
-- every non-admin caller and always evaluate to false, since a plain (non-definer) function or
-- inline subquery runs with the calling role's own row security in effect.
create or replace function has_company_access(target_company_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from application_access
    where company_id = target_company_id and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles: admins can read all profiles; only Super Admin/Admin can write;
-- everyone can update their own non-role, non-status fields (handled at the
-- application layer — this policy keeps writes to managers for simplicity).
-- ---------------------------------------------------------------------------
create policy "profiles_select_active_admins" on profiles
  for select using (is_active_admin());

create policy "profiles_insert_managers" on profiles
  for insert with check (is_admin_manager());

create policy "profiles_update_managers_or_self" on profiles
  for update using (is_admin_manager() or id = auth.uid());

-- ---------------------------------------------------------------------------
-- enquiries: public (anon) can INSERT only (the website contact form).
-- Any active admin can read/update. Sales/Support cannot delete.
-- ---------------------------------------------------------------------------
create policy "enquiries_public_insert" on enquiries
  for insert to anon with check (status = 'NEW');

create policy "enquiries_admin_select" on enquiries
  for select using (is_active_admin());

create policy "enquiries_admin_insert" on enquiries
  for insert to authenticated with check (is_active_admin());

create policy "enquiries_admin_update" on enquiries
  for update using (is_active_admin());

-- ---------------------------------------------------------------------------
-- interactions / followups: any active admin can read and write.
-- ---------------------------------------------------------------------------
create policy "interactions_admin_all" on interactions
  for all using (is_active_admin()) with check (is_active_admin());

create policy "followups_admin_all" on followups
  for all using (is_active_admin()) with check (is_active_admin());

-- ---------------------------------------------------------------------------
-- companies / users / applications / application_access
-- Support role: read-only. Everyone else active: read/write.
-- ---------------------------------------------------------------------------
create policy "companies_admin_select" on companies
  for select using (is_active_admin());

create policy "companies_admin_write" on companies
  for insert to authenticated with check (is_active_admin() and current_admin_role() <> 'Support');

create policy "companies_admin_update" on companies
  for update using (is_active_admin() and current_admin_role() <> 'Support');

create policy "users_admin_select" on users
  for select using (is_active_admin());

create policy "users_admin_write" on users
  for insert to authenticated with check (is_active_admin() and current_admin_role() <> 'Support');

create policy "users_admin_update" on users
  for update using (is_active_admin() and current_admin_role() <> 'Support');

create policy "applications_admin_select" on applications
  for select using (is_active_admin());

-- url is the only field the admin UI ever writes here (ApplicationsPage's "Edit URL") — the
-- catalog rows themselves (name/slug/description) are seeded, not admin-editable via this policy
-- alone, but Postgres RLS is row-level, not column-level, so this is enforced by the UI only
-- sending {url} in its update, same convention as handoff_secret's column-level protection above.
create policy "applications_admin_update" on applications
  for update using (is_active_admin() and current_admin_role() <> 'Support');

create policy "application_access_admin_select" on application_access
  for select using (is_active_admin());

create policy "application_access_admin_write" on application_access
  for insert to authenticated with check (is_active_admin() and current_admin_role() <> 'Support');

create policy "application_access_admin_update" on application_access
  for update using (is_active_admin() and current_admin_role() <> 'Support');

-- ---------------------------------------------------------------------------
-- audit_logs: insert-only by active admins, readable by active admins,
-- never updatable/deletable from the client.
-- ---------------------------------------------------------------------------
create policy "audit_logs_admin_select" on audit_logs
  for select using (is_active_admin());

create policy "audit_logs_admin_insert" on audit_logs
  for insert to authenticated with check (is_active_admin());

-- ---------------------------------------------------------------------------
-- notifications: readable/writable by any active admin (single shared feed).
-- ---------------------------------------------------------------------------
create policy "notifications_admin_all" on notifications
  for all using (is_active_admin()) with check (is_active_admin());

-- ---------------------------------------------------------------------------
-- users: a person can additionally read/update their own identity row
-- (needed for the central login/launcher page and basic self-service
-- profile edits). Never insert/delete as themselves, and never touch role-
-- or status-bearing fields here — those stay admin-only (see
-- users_admin_write/update above); this policy only covers what a person
-- may do to their own row at all, application-layer code still restricts
-- which columns a non-admin update may touch.
-- ---------------------------------------------------------------------------
create policy "users_self_select" on users
  for select using (id = auth.uid());

create policy "users_self_update" on users
  for update using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- companies: a person can read a company they have any application_access
-- row for (any status) — needed to show branding (name/logo) even while
-- signing in, before we know whether their access is still ACTIVE.
-- ---------------------------------------------------------------------------
create policy "companies_member_select" on companies
  for select using (has_company_access(id));

-- ---------------------------------------------------------------------------
-- application_access_public: a person can read their own grants to see which
-- applications they have ACTIVE access to. (2026-08-25: url/handoff_secret
-- moved to `applications` — one shared deployment per application, not per
-- grant — so this table itself no longer carries any secret. Kept as a view
-- rather than a base-table policy anyway, since it already existed and nothing
-- forces the change; a future column here would default to hidden unless
-- deliberately added to the select list below.)
-- ---------------------------------------------------------------------------
-- Deliberately a plain (non security_invoker) view: it must run with its
-- owner's privileges to bypass the base table's RLS (which grants no rows
-- to a non-admin user), so that this view's own WHERE clause below is the
-- actual and only authorization check for self access.
create or replace view application_access_public as
  select id, user_id, company_id, application, role, status, activated_at, deactivated_at
  from application_access
  where is_active_admin() or user_id = auth.uid();

grant select on application_access_public to authenticated;

-- applications_public: any authenticated person can read the app catalog's display fields (name,
-- description) but never handoff_secret — mirrors the same "view omits the secret column" pattern
-- above. `applications_admin_select` above already lets active admins see everything including
-- the secret; this is the customer-facing counterpart.
create or replace view applications_public as
  select id, name, slug, description, url, created_at
  from applications;

grant select on applications_public to authenticated;
