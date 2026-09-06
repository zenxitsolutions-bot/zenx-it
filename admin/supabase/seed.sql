-- ZenX Admin Portal — required seed data
-- Run after schema.sql and rls.sql.

insert into applications (id, name, slug, description)
values
  ('app_dietitian', 'ZenX Dietitian', 'zenx-dietitian', 'Client management, diet plans, weight progress and appointments for dietitians.'),
  ('app_pos', 'ZenX Small Business POS', 'zenx-pos', 'Point-of-sale, inventory and sales reporting for small businesses.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Wiring up an application's shared deployment (one deployment per application, serving every
-- company via company_id) — run once per application, after it's actually deployed:
--
--   update applications
--   set url = 'https://wellness.yourdomain.com', handoff_secret = '<a long random string>'
--   where slug = 'zenx-dietitian';
--
-- The same handoff_secret value must be set as ZENX_HANDOFF_SECRET in that deployment's own
-- server environment (server/.env there) — see its docs/API.md for the handoff endpoint this
-- secret verifies. Until both `url` and `handoff_secret` are set, issue-app-handoff refuses to
-- mint a token for that application (409 "not deployed yet").
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Creating your first admin (Super Admin) — two steps:
--
-- 1. In the Supabase dashboard, go to Authentication → Users → Add user,
--    and create a user with your admin email + a password.
-- 2. Copy that user's UUID and run:
--
--   insert into profiles (id, first_name, last_name, email, role, status)
--   values ('<uuid-from-step-1>', 'Your', 'Name', 'you@zenxitsolutions.com', 'Super Admin', 'ACTIVE');
--
-- After that you can sign in at /admin/login with the email + password you set.
-- ---------------------------------------------------------------------------
