# Implementation plan — 2026-08 update (auth: remove signup, forced password change)

Source spec: [`docs/specs/2026-08-update.md`](./2026-08-update.md) (sections 4 and 2.1).
Planning session: 2026-08-22. No code has been written yet — this is the plan only.

Decisions locked in during planning (all confirmed with the user, not guessed):

| Question | Decision |
|---|---|
| Spec says "keep Forgot Password" but it doesn't exist anywhere in the repo | Build it new, full scope, as part of this work |
| Forgot-password delivery mechanism | Real email, via a chosen provider (not an admin-mediated or dev-stub flow) |
| Email provider | **Resend** |
| Does `mustChangePassword` apply only to dietitians (as literally scoped in the spec heading) or to every admin-created account? | **Every admin-created account** (client, dietitian, admin) — self-registration is gone for all three roles, so all three now go through the same admin-create path |

---

## 1. Current codebase map

**Frontend** — `client/` (React 18 + Vite, JS only, Tailwind v4, shadcn/ui). Routing is one
`createBrowserRouter` tree in `client/src/routes/router.jsx`: public routes (`/`, `/login`,
`/register`, `/unauthorized`) plus `/app/*` wrapped in `<ProtectedRoute>` (redirects to `/login`
if `useAuth().user` is null) → `<PortalLayout>` → per-path `<RoleRoute roles={...}>` sourced from
`client/src/lib/portalNav.js` (`NAV_BY_ROLE` / `ROUTE_ROLES` — single source of truth the nav and
route guards both derive from). Auth state lives in `client/src/context/AuthContext.jsx`
(React Context, not React Query — holds `user`, `isLoading`, and `login/register/logout/updateUser`
callbacks), consumed via `client/src/hooks/useAuth.js`. All other server state goes through
React Query hooks in `client/src/hooks/*` calling `client/src/api/*.api.js`, which all go through
one `axiosClient` (`client/src/api/axiosClient.js`) — access token attached from an in-memory
`tokenStore`, with a response interceptor that auto-refreshes on a single 401 and retries once.

**Backend** — `server/` (Node/Express, ESM). MySQL + `mysql2`, **not** MongoDB/Mongoose as
CLAUDE.md §2 states — the stack was migrated in commit `4212bd0` (`refactor: migrate backend from
MongoDB/Mongoose to MySQL`); worth flagging since it's a deviation from the committed project
rules, though clearly a deliberate, already-completed one, not something this plan should re-litigate.
Schema lives in `server/src/db/schema.sql` (idempotent `CREATE TABLE IF NOT EXISTS`), with
`server/src/db/migrate.js` applying it plus a hand-maintained `ALTERS` array for columns added
after a table already existed on a deployed DB — that array is the pattern this plan's schema
changes must follow. Each resource has route → controller → (zod) schema → model, e.g.
`routes/user.routes.js` → `controllers/user.controller.js` → `schemas/user.schema.js` →
`models/User.js`. Central `asyncHandler` wrapper + `errorHandler` middleware, per CLAUDE.md §2.

**Auth/roles today**: three roles (`client`, `dietitian`, `admin`) stored on `users.role`.
JWT access token (15 min, in memory client-side) + JWT refresh token (30 days, `httpOnly` cookie,
scoped to `/api/auth`, with a `refresh_token_version` column on `users` for server-side revocation).
`server/src/middleware/authenticate.js` verifies the access token and loads `req.user`;
`server/src/middleware/authorize(...roles)` gates by role only — there is no concept today of a
login-blocking flag. Every protected router calls `router.use(authenticate)` itself (each router
composes its own middleware chain — no single global auth gate in `app.js`). Registration exists
end-to-end: `POST /api/auth/register` (public, always creates `role: 'client'`) →
`RegisterPage.jsx` at `/register`, linked from `LoginPage.jsx`. Separately, and already fully
built, admins can create a user of **any** role directly: `POST /api/users` (admin-only) →
`UserFormDialog.jsx` — this is the flow `mustChangePassword` needs to hook into; it is not new.

---

## 2. Per-requirement breakdown

### Requirement 1 — Remove self-registration (spec §4)

**Classification**: Removal (UI + route + endpoint), all three surfaces.

**Files touched**:
- `client/src/pages/RegisterPage.jsx` — delete.
- `client/src/routes/router.jsx` — remove the `/register` route + its lazy import.
- `client/src/pages/LoginPage.jsx` — remove the "New to Nourishly? Create an account" `<Link>` block (lines ~90–95); replace with the new "Forgot your password?" link (Requirement 1b below).
- `client/src/api/auth.api.js` — remove `registerRequest`.
- `client/src/context/AuthContext.jsx` — remove the `register` callback and its import; remove `register` from the context value.
- `server/src/routes/auth.routes.js` — remove `POST /register`.
- `server/src/controllers/auth.controller.js` — remove the `register` handler.
- `server/src/schemas/auth.schema.js` — remove `registerSchema`.
- `docs/API.md` — remove the `/auth/register` row (and add the new rows from Requirement 3 below, same commit per CLAUDE.md §7).

**Already partially built / doesn't need touching**: `POST /api/users` (admin-only create, any
role) and `UserFormDialog.jsx` already do exactly what "no self-registration, admin creates
accounts" requires — this is the retained creation path, not something to build.

**Ambiguity — resolved**: "Keep Forgot Password" implied a feature that doesn't exist. Resolved:
build it new (see Requirement 1b).

**Ambiguity — not blocking, flagging only**: removing `POST /auth/register` outright (rather than
just disabling it) matches "must be impossible, not just hidden" literally. No soft-disable/flag
approach is proposed.

### Requirement 1b — Forgot Password (new, implied by spec §4's "keep")

**Classification**: New feature (not in the original spec's numbered list, but required to satisfy
"Keep ... Forgot Password" now that self-registration — the only other account-recovery-adjacent
path — is gone).

**Files touched (new)**:
- `server/src/db/schema.sql` — new `password_reset_tokens` table.
- `server/src/models/PasswordResetToken.js` — new model (`create`, `findValidByTokenHash`, `markUsed`).
- `server/src/utils/email.js` — new: thin Resend wrapper, `sendPasswordResetEmail(to, resetUrl)`.
- `server/src/schemas/auth.schema.js` — add `forgotPasswordSchema`, `resetPasswordSchema`.
- `server/src/controllers/auth.controller.js` — add `forgotPassword`, `resetPassword`.
- `server/src/routes/auth.routes.js` — add `POST /forgot-password` (public, rate-limited), `POST /reset-password` (public).
- `server/.env.example`, `server/src/config/env.js` — add `RESEND_API_KEY`, `EMAIL_FROM`, `PASSWORD_RESET_TOKEN_TTL_MINUTES`.
- `server/package.json` — add `resend` dependency.
- `client/src/pages/ForgotPasswordPage.jsx` — new.
- `client/src/pages/ResetPasswordPage.jsx` — new.
- `client/src/api/auth.api.js` — add `forgotPasswordRequest`, `resetPasswordRequest`.
- `client/src/routes/router.jsx` — add `/forgot-password`, `/reset-password` routes.
- `client/src/pages/LoginPage.jsx` — add "Forgot your password?" link.
- `docs/API.md` — add the two new rows.

**Design** (kept deliberately simple, consistent with the rest of the auth surface):
- `POST /auth/forgot-password { email }` → always responds `200` with an identical generic
  message regardless of whether the email exists (prevents account enumeration). If it does
  exist, generate a random 32-byte token, store only its SHA-256 hash + a short expiry
  (`PASSWORD_RESET_TOKEN_TTL_MINUTES`, default 60) in `password_reset_tokens`, email a link
  containing the *plaintext* token (`${CLIENT_ORIGIN}/reset-password?token=...`) via Resend.
  Rate-limited the same way `POST /enquiries` already is (`express-rate-limit`, reused pattern).
- `POST /auth/reset-password { token, password }` → hash the incoming token, look up an unused,
  unexpired match, update `users.password_hash`, mark the token used, and — since a leaked email
  could mean a compromised session — bump `refresh_token_version` to invalidate any existing
  refresh cookie. Does **not** touch `must_change_password` (a voluntary reset by someone who
  already knows/knew their password is a different case from a forced first-login change).

### Requirement 2 — `mustChangePassword` flag + forced first-login change (spec §2.1)

**Classification**: New feature, both DB schema and cross-cutting middleware.

**Files touched**:
- `server/src/db/schema.sql` — add `must_change_password BOOLEAN NOT NULL DEFAULT FALSE` to `users`.
- `server/src/db/migrate.js` — add the matching `ALTER TABLE users ADD COLUMN must_change_password ...` to the `ALTERS` array (existing pattern — DB-level default must be `FALSE`, not `TRUE`, so this migration doesn't silently lock out every existing user; see design note below).
- `server/src/models/User.js` — add `mustChangePassword` to `mapUser`; add it as a `createUser` param; add a dedicated `setPassword(id, { passwordHash, mustChangePassword })` (kept separate from the generic `updateUser` patch path, which is also reachable by `PATCH /users/:id` and must never accept a raw password hash); add `bumpRefreshTokenVersion(id)`.
- `server/src/controllers/user.controller.js` — `createUser`: pass `mustChangePassword: true` always (admin-created path — see the "flag scope" decision above).
- `server/src/schemas/auth.schema.js` — add `changePasswordSchema { currentPassword, newPassword }`.
- `server/src/controllers/auth.controller.js` — `login`/`me`: `mustChangePassword` flows through automatically once it's on the mapped row (`toClientShape` passes through any column present, no allowlist to update). Add `changePassword` handler: verify `currentPassword` against the stored hash (works whether "current" is the admin-set temp password or a normal password), hash + store `newPassword`, clear the flag, and — so the UX in spec item 3 ("let them into the dashboard", no re-login) works — reissue a fresh access token + refresh cookie the same way `login` does.
- `server/src/routes/auth.routes.js` — add `POST /change-password` (`authenticate` only, deliberately **not** gated by the new block-middleware below — this is the one call the spec says must stay reachable).
- `server/src/middleware/blockIfMustChangePassword.js` — new: `if (req.user.mustChangePassword) throw ApiError.forbidden(...)`.
- Every other router — `user.routes.js`, `enquiry.routes.js`, `plan.routes.js`, `recipe.routes.js`, `call.routes.js`, `progress.routes.js`, `report.routes.js`, `insights.routes.js` — insert `blockIfMustChangePassword` right after each router's existing `router.use(authenticate...)` line. (`enquiry.routes.js` already splits public vs. authenticated halves — the new middleware only joins the authenticated half, same as `authorize('admin')` does there today.)
- `client/src/api/auth.api.js` — add `changePasswordRequest`.
- `client/src/context/AuthContext.jsx` — add a `changePassword` callback: calls the endpoint, updates the in-memory access token, and replaces `user` with the response's updated user (flag now `false`) — mirrors what `login` already does.
- `client/src/pages/ChangePasswordPage.jsx` — new, standalone (not under `PortalLayout` — someone forced here shouldn't see nav to screens they can't use yet). Form: current password, new password, confirm.
- `client/src/routes/router.jsx` — add a top-level `/change-password` route.
- `client/src/routes/ProtectedRoute.jsx` — after the existing "no user → `/login`" check, add: if `user.mustChangePassword` and the current path isn't already `/change-password`, `<Navigate to="/change-password" replace>`. This is what satisfies "block every dashboard route" and the direct-URL-typing verification step, since every `/app/*` path passes through this one guard.
- `ChangePasswordPage.jsx` itself should redirect to the portal home if `mustChangePassword` is already `false` (reached via typed URL after the flag is cleared) — small self-contained check, not a new shared guard.
- `docs/API.md` — add the `POST /auth/change-password` row, and note the new `mustChangePassword` field on the `user` object wherever it's documented (`/auth/login`, `/auth/me`, `/users` rows).

**Design note — DB default must be `FALSE`, not `TRUE`**: the spec says the flag "default[s] true
for accounts *created by admin*" — that's an application-level default at creation time
(`user.controller.js#createUser`), not a column-level default. If the `ALTER TABLE` in
`migrate.js` defaulted the column to `TRUE`, every already-existing user on any deployed
database (the seeded demo accounts, and any real users created before this change ships) would
be retroactively locked out on their next login. The column default is `FALSE`; only the
admin-create code path sets it `TRUE` explicitly.

**Already partially built**: nothing — no flag, no change-password endpoint, no forced-screen
concept exists anywhere today. `UserFormDialog.jsx`'s "Temporary password" label already
signals the *intent* that admin-set passwords are meant to be changed, so the UI copy is
directionally consistent, but no enforcement exists.

**Ambiguity — resolved**: whether the flag applies to dietitians only or every admin-created
role. Resolved: every admin-created account (client, dietitian, admin) gets it, defaulted `true`
at creation.

**Ambiguity — flagging only, no action needed**: the spec's verification step ("an admin-created
dietitian cannot reach the dashboard by typing the URL directly") only names dietitian, but since
the flag/guard is role-agnostic by design (`ProtectedRoute` checks the flag, not the role), the
same guarantee automatically holds for admin-created clients and admins too — consistent with the
broadened scope decision, not a separate thing to build.

**Existing seed users** (`server/src/seed.js`, `SEED_USERS`): should be created with
`mustChangePassword: false` explicitly (i.e. `createUser` in seed.js should not go through the
same forced-`true` path as `user.controller.js#createUser` — call `models/User.js#createUser`
directly with the flag off, as it already does for other fields). Otherwise every documented demo
login (`admin@nourishly.test` etc., used throughout `docs/worklog/`) would break, which the spec
never asked for.

---

## 3. Shared foundation

Because this spec is narrowly scoped to auth (not the broader booking/plans/calls/progress
surface), there is exactly one shared foundation both requirements — plus the forgot-password
addition — sit on top of: **the account lifecycle system** (how a user comes into existence, how
they prove who they are, and what gates stand between "authenticated" and "allowed to use the
app"). Designing this once means:

- **One `users` schema change, not two.** `must_change_password` is added alongside, and
  independently of, `password_reset_tokens` — but both are reasoned about together so
  `changePassword` (forced-flow) and `resetPassword` (forgot-password-flow) share as much as
  sensibly possible: both ultimately call the same low-level "update this user's password hash"
  model function, and both consider whether to bump `refresh_token_version`. They deliberately
  **don't** share a controller function, because their surrounding rules differ (one requires
  knowing the current password and clears a flag; the other requires a mailed token and doesn't
  touch the flag) — forcing them into one function would be the kind of premature abstraction
  CLAUDE.md §3 warns against.
- **One middleware chain shape.** `authenticate` → `blockIfMustChangePassword` → `authorize(...)`
  is the new standard order for every protected router. It's implemented as a second small
  middleware (not folded into `authenticate`) specifically so `/auth/me`, `/auth/logout`, and
  `/auth/change-password` can opt out by simply not adding it, without needing a bypass-list
  inside `authenticate` itself.
- **One client-side gate.** `ProtectedRoute` already is the single chokepoint every `/app/*`
  route passes through (that's *why* `RoleRoute` doesn't need to duplicate the "logged in?"
  check). Adding the `mustChangePassword` redirect there — rather than in `RoleRoute`, or
  per-page — is what makes "block every dashboard route" true by construction instead of by
  remembering to add a check to every screen.
- **One error-message contract.** Both the forced-change block (`403`, thrown from
  `blockIfMustChangePassword`) and a bad reset token (`400`, thrown from `resetPassword`) go
  through the existing `ApiError` → central `errorHandler` path — no new error-handling
  mechanism needed.

No booking/availability engine, `Plan`, `Call`, or `Progress` work is in scope for this spec —
those exist already (see schema.sql) and are untouched by these two requirements.

---

## 4. Phased implementation order

Each phase should build, and the server should start, before moving to the next (CLAUDE.md §8).

### Phase A — Schema + model foundation
1. `schema.sql`: add `must_change_password` to `users`; add `password_reset_tokens` table.
2. `migrate.js`: add the `must_change_password` `ALTER` (default `FALSE`).
3. `models/User.js`: `mapUser`, `createUser`, new `setPassword`, new `bumpRefreshTokenVersion`.
4. `models/PasswordResetToken.js`: new model.
5. Run `npm run migrate` (or equivalent) against local DB; confirm `npm run seed` still succeeds and seeded accounts have `mustChangePassword: false`.

*Depends on nothing. Everything else depends on this.*

### Phase B — Remove self-registration
1. Delete `RegisterPage.jsx`; remove `/register` route; remove the register link from `LoginPage.jsx`.
2. Remove `registerRequest`, `AuthContext#register`, `POST /auth/register`, `auth.controller#register`, `registerSchema`.
3. Update `docs/API.md`.
4. `npm run build` (client) + start server; confirm `/register` 404s both as a route and as an API call.

*Depends on nothing (independent of Phase A) — could run in parallel with Phase A, but sequencing it first is simpler to review as one small, obviously-safe commit.*

### Phase C — Forced password change (core of spec §2.1)
1. Server: `blockIfMustChangePassword` middleware; wire into every router except the three auth exceptions; `changePasswordSchema` + `changePassword` controller + `POST /auth/change-password` route.
2. `user.controller.js#createUser`: set `mustChangePassword: true`.
3. Client: `ChangePasswordPage.jsx`, `/change-password` route, `ProtectedRoute` redirect, `AuthContext#changePassword`, `changePasswordRequest`.
4. Update `docs/API.md`.
5. Manual verification (per spec's explicit ask): admin-create a dietitian → log in as them → confirm redirect to `/change-password` → confirm typing `/app/overview` directly still redirects → change password → confirm redirected into the dashboard → confirm typing `/change-password` again now redirects away. Repeat once for an admin-created client or admin to confirm the broadened scope decision.

*Depends on Phase A (schema) and, loosely, Phase B (touches `LoginPage.jsx`/`router.jsx` again — smaller diff if signup is already gone). Do not run in parallel with Phase B.*

### Phase D — Forgot password (new feature, lower urgency than C)
1. Server: `resend` dependency, `email.js`, env vars, `forgotPasswordSchema`/`resetPasswordSchema`, `forgotPassword`/`resetPassword` controllers, routes, rate limiting.
2. Client: `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`, routes, `LoginPage.jsx` link, API functions.
3. Update `docs/API.md` and `.env.example`.
4. Manual verification: request a reset for a real inbox, confirm the email arrives via Resend, follow the link, set a new password, confirm old refresh cookie is now rejected (session invalidation), log in with the new password.

*Depends on Phase A (schema) only — independent of B and C, but sequenced last because it's the
feature the spec only implies rather than states, and because it needs a real Resend API key to
verify end-to-end, which may not be available immediately.*

### Cross-cutting, do once at the end
- `docs/worklog/2026-08-22.md` — session log per CLAUDE.md §7.
- Full click-through of all three roles' login (fresh account via admin-create, forced change,
  forgot-password, normal subsequent login) before calling this spec done.

---

## 5. Open items for the user (not blocking the plan, but worth a decision before or during Phase D)

- **Resend sender domain**: `EMAIL_FROM` needs a verified sending domain/address in the Resend
  dashboard before real emails will deliver — that setup happens outside this repo and outside
  Claude Code's reach; flagging so it isn't a surprise when Phase D's manual verification step is
  reached.
- **Reset link TTL**: defaulted to 60 minutes in the design above; say if a different window is wanted.
