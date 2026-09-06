# Architecture

## Overview

Nourishly is a monorepo with two independently run apps:

- **`client/`** — React 18 + Vite (JavaScript, no TS), Tailwind v4, shadcn/ui (radix base, Nova
  preset re-themed onto the legacy palette in `client/src/index.css`).
- **`server/`** — Node.js + Express (ESM), MySQL via `mysql2` (hand-written SQL, no ORM).

## Auth flow

- Access token: short-lived JWT, returned in the response body on login/register/refresh, held
  only in memory on the client (`client/src/api/tokenStore.js`) — never in `localStorage`.
- Refresh token: long-lived JWT in an `httpOnly` cookie scoped to `/api/auth`, set by the server,
  read by `POST /api/auth/refresh`. `sameSite` is `lax` in development (client/server share the
  same site — `localhost` — even on different ports) and `none` (+ `secure`) in production, since
  the deployed client (Netlify) and server (Render/Railway) are genuinely different sites.
- `client/src/context/AuthContext.jsx` silently calls `/auth/refresh` → `/auth/me` on mount to
  restore a session; `client/src/api/axiosClient.js`'s response interceptor retries a single
  401 by refreshing, then replays the original request.
- `server/src/middleware/authenticate.js` verifies the access token and loads `req.user`;
  `authorize(...roles)` gates by role; per-resource ownership checks live in each controller.

## Multi-tenancy (shared ZenX auth)

Nourishly (this app) is the customer SaaS side of a two-app pair: the sibling `admin-server`
repo (ZenX) is the source of truth for organizations ("companies") and their subscriptions, and
this app is where each subscribing company's own dietitians/clients live and work. A company's
contact reaches this app via SSO — `POST /api/auth/handoff` verifies a short-lived JWT admin-server
signs (`ZENX_HANDOFF_SECRET`, shared between the two deployments) and either links or creates the
local account, carrying that token's `company_id`/`company_slug`/role through onto `users`.

- Every `users` row has a `company_id` (admin-server's real `companies.id` — no FK, cross-service
  id, same trust model as `zenx_user_id`). A ZenX `'wellness_admin'` grant becomes this app's org
  `admin`; anything else becomes `dietitian`.
- `admin` is **org-scoped, not platform-scoped**: every list/find query filters by
  `req.user.companyId`, and `utils/scope.js#assertUserInCompany`/`assertDietitianOwnsClient` gate
  every by-id lookup the same way. There is no "see everything" role in this app — a ZenX platform
  admin only exists in admin-server's own `profiles` table, never here.
- Only `users`/`enquiries`/`program_plans` carry `company_id` directly; every other tenant-owned
  table (`recipes`, `plans`, `calls`, `messages`, ...) is scoped transitively through its owning
  user's `company_id` — same convention already used for child tables like `plan_meals`.
- Pre-multi-tenancy data (and local dev/seed data) lives under one real, ZenX-managed "Legacy
  Practice" company (`LEGACY_COMPANY_ID`) rather than an unscoped NULL — see `db/migrate.js`'s
  `backfillLegacyCompany` and `docs/worklog/2026-08-27.md`.
- An org `admin` creating a sub-user (`user.controller.js#createUser`) always stamps
  `companyId: req.user.companyId` — never client-supplied — so a company can only ever grow its
  own roster, matching "Wellness admins manage their own users."

## Request flow (server)

`routes/*.routes.js` → `middleware/validate.js` (zod) → `middleware/authenticate.js` /
`authorize.js` → `controllers/*.controller.js` (wrapped in `middleware/asyncHandler.js`) →
`models/*.js` (hand-written SQL over the `mysql2` pool in `db/pool.js`) →
`middleware/errorHandler.js` formats any thrown `utils/ApiError.js`.

`models/*.js` are plain data-access modules, not an ORM: each function runs its own
parameterized SQL and returns camelCase JS objects. `utils/serialize.js#toClientShape` renames a
row's `id` to `_id` (and strips internal-only fields like `passwordHash`) immediately before a
controller calls `res.json(...)` — this is the one place the pre-migration Mongoose-style `_id`
JSON contract is reconstructed, done deliberately so the client needed zero changes when the
database moved off MongoDB. See `server/src/db/schema.sql` for the relational schema.

## Client data flow

`components/` never call the API directly. `hooks/` (React Query) call `api/*.api.js`, which call
the shared `axiosClient`. Screens built before their endpoint exists use `mocks/` fixtures with a
`TODO(api):` comment (CLAUDE.md rule 5), never inline fake arrays.

## Folder structure

See `CLAUDE.md` §1 and the approved plan for the full `client/`/`server/` layout.

## Not yet implemented

The marketing site itself (the ported legacy homepage beyond the scaffold placeholder), the
dietitian-side Overview dashboard, admin usage of the weekly plan builder, and file storage
beyond local disk — see `docs/PROGRESS.md` for the full current-status summary.
