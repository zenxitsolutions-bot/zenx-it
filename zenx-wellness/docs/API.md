# API reference

Base URL: `http://localhost:4000/api` (`VITE_API_URL` in `client/.env`).

Auth column: **Public** / **Auth** (any logged-in role) / role names = only those roles. "Own"
means the controller filters to resources owned by / assigned to the caller.

## Auth — `server/src/routes/auth.routes.js`

Self-registration does not exist — there is no public account-creation endpoint. Every account is
created by an admin (`POST /users`, below).

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| POST | `/auth/login` | Public | `{email, password}` → `{accessToken, user}` + refresh cookie |
| POST | `/auth/forgot-password` | Public, rate-limited (5 / 15 min / IP) | `{email}` → `{message}` — always the same generic response whether or not the email is registered; if it is, emails a reset link via Resend (`server/src/utils/email.js`) |
| POST | `/auth/reset-password` | Public | `{token, password}` → `204` — validates the emailed token (hashed, unused, unexpired), sets the new password, invalidates the token, and bumps `refreshTokenVersion` (any existing session is logged out). Does **not** touch `mustChangePassword` — a still-set forced-change flag is enforced separately on the caller's next request |
| POST | `/auth/refresh` | Public (cookie) | — → `{accessToken}` |
| POST | `/auth/logout` | Auth | — → clears refresh cookie |
| GET | `/auth/me` | Auth | — → `{user}` |
| POST | `/auth/change-password` | Auth (incl. a caller whose `mustChangePassword` is still `true` — the one exception to the block below) | `{currentPassword, newPassword}` → `{accessToken, user}` + refresh cookie — verifies `currentPassword`, sets `newPassword`, clears `mustChangePassword`, reissues tokens |

Every route below except the ones above requires `mustChangePassword: false` on the caller —
`403` otherwise (`blockIfMustChangePassword` middleware, mounted right after `authenticate` on
every other router). The `user` object returned by `/auth/login`, `/auth/me`, and the `/users`
routes now includes `mustChangePassword`.

**Account status (added 2026-08-23, `docs/specs/2026-round2-fixes.md` item 2):** `users.accountStatus`
is one of `active`/`inactive`/`suspended` (default `active`). `suspended` is enforced in two places
so it can never be bypassed by an already-issued token: `POST /auth/login` rejects it with `403`
before issuing any token, and the `authenticate` middleware rejects it with `403` on every
subsequent request from a caller who was already logged in when they got suspended — the very next
request they make fails, not just their next login. `inactive` has no login effect at all; it's a
soft flag with no enforced behavior beyond what's visible in the admin UI.

## Users — `user.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/users` | admin, dietitian, client | `?role=&assignedDietitian=` → `[user]` — dietitian is forced to own clients; client is forced to `role=dietitian` (directory browse only, ignores other filters) |
| GET | `/users/:id` | admin, dietitian(own), self | → `{user}` |
| PATCH | `/users/me` | Auth | `{name?, phone?, assignedDietitian?, timezone?}` → `{user}` — `assignedDietitian` settable only by clients, and only to a real `role:dietitian` id (`400` otherwise); `timezone` must be a real IANA zone name (validated via `Intl.DateTimeFormat`, `400` otherwise) |
| PATCH | `/users/:id` | admin, dietitian(own client, restricted) | admin: `{role?, email?, phone?, address?, qualifications?, accountStatus?, assignedDietitian?, programPlan?, planDuration?, ...}` → `{user}`; dietitian: same endpoint, but caller must be the `assignedDietitian` of a `role:client` target (`403` otherwise) and the payload is allowlisted to exactly `{email?, phone?}` (`403` on any other key, even ones the caller could set on themselves via `/users/me`) — see the Clients note below | `email` (either caller) is checked for uniqueness against every other account (`409` with the same shape as `POST /users`'s conflict); `assignedDietitian` validated against a real `role:dietitian` id; `programPlan`/`planDuration` only applied when `role:client` (cleared if the patch changes role away from client) |
| POST | `/users` | admin | `{name, email, password, role, phone?, address?, qualifications?, assignedDietitian?, programPlan?, planDuration?}` → `{user}` — `phone`/`address` are **required** when `role:'dietitian'` (`400` with a field-level message otherwise; optional and format-validated only when present for `role:'client'`/`'admin'`); `qualifications` only meaningful for `role:'dietitian'`; `assignedDietitian`/`programPlan`/`planDuration` only applied when `role:client`; `assignedDietitian` validated against a real `role:dietitian` id; `email` uniqueness enforced (`409` on a duplicate, same check `PATCH` uses); `mustChangePassword` is always set `true` (forces a change on the new account's first login); `role:'client'` also queues a `client-welcome` email (2026-08-23, see below) |

**Client-account-created email (added 2026-08-23)**: queued (never for `role:'dietitian'`/`'admin'`)
from both places a client account gets created — here, and `enquiry.controller.js`'s Converted
transition (see the Enquiries section above) — via the shared
`server/src/services/accountNotifications.js#notifyClientAccountCreated`. Contains the temp
password (the plaintext only ever exists transiently in the creating request — a `passwordHash` is
all that's ever stored, so this is the only place it can be captured for the email), the assigned
`programPlan`'s name and a computed "duration (start – end)" string (start = the account's own
`createdAt`; there's no explicit enrollment-start-date column in the schema, so this is a judgment
call, not a stored fact — see the function's own comment), and a plain login URL
(`CLIENT_ORIGIN/login`). **Integrates with the forced-password-change flow with no extra code**:
`client/src/routes/ProtectedRoute.jsx` already force-redirects any `mustChangePassword` account to
`/change-password` regardless of which URL they land on post-login, so the email doesn't need to
link anywhere special.

Every `user` object now includes `programPlan` (`null`, or `{_id, name}` populated via a join when
set — see Program Plans below) and `planDuration` (a free string from a fixed client-side list —
`1 month`/`3 months`/`6 months`/`12 months` — not itself a validated enum server-side beyond that
list). Both are only meaningful for `role: 'client'`.

`timezone` (added 2026-08-23, fixing the availability timezone bug — see the Availability section
below) is an IANA zone name (e.g. `"Asia/Kolkata"`), defaulting to `"UTC"` for every account until a
dietitian explicitly sets their own via `PATCH /users/me`. Only meaningful for `role: 'dietitian'`.

**Added 2026-08-23 (`docs/specs/2026-round2-fixes.md` items 2/3) — `address`, `qualifications`,
`accountStatus`:** `address` (free text, ≤255 chars) and `qualifications` (free text, ≤2000 chars,
e.g. "Registered Dietitian, MS in Clinical Nutrition") are both nullable on every role but only
*required* (and only shown as a field) for `role:'dietitian'`. `accountStatus` is
`'active'`/`'inactive'`/`'suspended'` (default `'active'`) — see the Auth section above for its
login-blocking effect; nothing in the `users`/`calls`/`plans` tables is filtered, hidden, or
reassigned based on it (see the Calls note below for what that means for a suspended/inactive
dietitian's existing appointments).

**Editing a client's email/phone (item 3):** both the admin edit dialog and a dietitian editing
their own assigned client go through this same `PATCH /users/:id` — a dietitian is just restricted
to the `{email, phone}` allowlist above. **Email-as-login-identifier**: nothing about changing
`users.email` invalidates an existing session. Both the access and refresh JWTs sign only
`{sub: user.id, ...}` — never the email — and `authenticate` looks the user up by that id on every
request, so a client who's mid-session when their email is changed stays logged in exactly as
before; only the credential they need to present *the next time they log in* changes. No extra
handling was needed beyond the uniqueness check itself (`409` if the new email is already taken by
a different account, surfaced as a field-level error on `email`).

**Deactivating/suspending a dietitian and their upcoming appointments:** nothing does, or ever did,
cascade from `accountStatus` (or any prior status concept — there wasn't one before this change)
into `calls`, `assigned_dietitian_id`, or `plans`. Setting a dietitian to `inactive` or `suspended`
only affects login (see the Auth section); their existing clients stay assigned, their existing
calls/plans are untouched, and nothing about them is hidden from an already-assigned client's own
views. This was a deliberate design choice, not an oversight: it means deactivating a dietitian is
guaranteed not to silently orphan anything, but it also means it does **not** currently stop a
suspended dietitian's calls from showing as normal on a client's Calls tab, and does **not** remove
them from the dietitian-picker a new/unassigned client sees (`GET /users?role=dietitian`, used by
both the client's self-service picker and the admin's Add Client assignment field) — a client could
still pick or already see a suspended dietitian as if nothing had changed. Filtering that picker
was considered and deliberately deferred: the same endpoint is also used to resolve a dietitian's
*name* for an already-assigned client in a few read-only display contexts, so adding
exclusion-by-status would need a new query-param distinction threaded through ~4 call sites rather
than a one-line change — flagging this as a real, open gap rather than solving it silently.

## Program Plans — `programPlan.routes.js`

A named service/program a client can be enrolled in (e.g. "Weight Loss") — entirely separate from
the `plans`/`plan_meals` weekly meal-plan tables below. Automatically visible to every dietitian
(no per-dietitian ownership). Admin can create/edit/activate-deactivate — no delete endpoint.

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/program-plans` | admin, dietitian | `?activeOnly=true` (admin only — dietitian requests are always forced active-only server-side) → `[{name, description, active}]` |
| POST | `/program-plans` | admin | `{name, description?}` → `{plan}` (`active` defaults `true`) |
| PATCH | `/program-plans/:id` | admin | `{name?, description?, active?}` → `{plan}` |

## Enquiries — `enquiry.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| POST | `/enquiries` | Public, rate-limited (5 / 15 min / IP) | `{goal, name, email, phone, preferredSlot?, note?}` → `{enquiry}` — queues an `enquiry-acknowledgment` email to the enquiry's own address (2026-08-23) |
| GET | `/enquiries` | admin | `?status=&page=&limit=` → `{enquiries[], total, page, pages}` |
| GET | `/enquiries/:id` | admin | → `{enquiry}` |
| GET | `/enquiries/:id/history` | admin | → `[{status, note, call, createdAt}]` — the full, immutable, append-only timeline (never paginated); `call` is only set on a `follow-up` entry that booked a real call |
| PATCH | `/enquiries/:id` | admin | Body shape depends on `status` (a zod discriminated union — see below) → `{enquiry}`. Every transition appends one `enquiry_history` row; nothing is ever overwritten except the enquiry's own single `note` column, which always reflects the *latest* note |
| DELETE | `/enquiries/:id` | admin | → `204` |

**Rewritten 2026-08-23 (`docs/specs/2026-round2-fixes.md` item 1) — account creation moved from
Follow-up to Converted.** Each `enquiry` has `convertedUserId` (`null` until the lead gets a real
client account). `PATCH /enquiries/:id`'s payload by `status`:
- `'new'` — no extra fields.
- `'contacted'` — `{note}` (required — the conversation summary).
- `'closed'` (labelled **"Unsuccessful"** in the UI — no separate enum value) — `{note}` (required — the reason).
- `'follow-up'` — `{dietitian, scheduledAt, note?}`. Books a real call through
  `server/src/services/callService.js#bookCall` — the **same** function `POST /calls` itself calls
  (availability check, transaction, and the booking-email notification to both the dietitian and
  this contact's own email — see the Calls section below). Before 2026-08-23 this called the
  `models/Call.js` insert directly, which silently skipped the booking email for every Follow-up
  call; fixed by routing both entry points through the one shared service. Held directly against
  the **enquiry**, not a client account, since none exists yet — the call's `client` is `null` and
  `enquiry` is set to `{_id, name, phone, email}`; a client account is never created at this step,
  no matter how many times Follow-up is used.
- `'converted'` (labelled **"Successfully Converted / Won"** in the UI) — `{planId?, planDuration?,
  password?}`, required the first time (enforced in the controller, since whether an account
  already exists is DB state a static schema can't see) and omitted on a later re-trigger, which is
  then just a no-op status change. Creates the lead's client account, prefilled from the enquiry
  (`mustChangePassword: true`, no `assignedDietitian` — the new client picks one afterward via the
  existing self-service `DietitianPickerDialog`, same as before). In the same transaction: every
  call still holding `enquiry_id = this enquiry` is re-pointed onto the new `client_id` (the same
  row, same history — not a copy), and the enquiry's full `enquiry_history` is copied into a
  `client_notes` entry per row (`[<Status label>] <note>`) so the new client isn't a blank slate.
  **After** the transaction commits (2026-08-23), a `client-welcome` email is queued to the new
  account — see the Users section below for what it contains; never queued from inside the
  transaction itself, so a conversion that ends up rolling back can never have already sent one.

## Plans — `plan.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/plans` | Auth (own) | `?client=&week=` → `[plan]` (meals populate `recipe`) |
| GET | `/plans/:id` | Auth (own) | → `{plan}` |
| POST | `/plans` | dietitian(own client only, `403` otherwise — `dietitian` derived from caller), admin(explicit `dietitian`) | `{client, dietitian?, title?, week, weekEnd, meals[]}` → `{plan}` |
| PATCH | `/plans/:id` | dietitian(own plan only, `403` otherwise), admin | `{title?, meals?, published?}` → `{plan}` — a genuine `published` transition (`false`/unset → `true`) queues a `plan-published` email to the client (2026-08-23, see below); a repeat `published: true` on an already-published plan (or any other field changing) does not |
| PATCH | `/plans/:id/meals/:index` | client (own) | `{completed?, swapRequested?}` → `{plan}` — client can mark a meal eaten or flag it for a swap; cannot change what the meal is |
| DELETE | `/plans/:id` | dietitian, admin | → `204` |

Each meal slot: `{day, time, mealType, recipe, customTitle, completed, swapRequested, notes}`.
`notes` (added 2026-08-22, spec §6) is optional free text on the meal itself — captured in the plan
builder, shown on the client profile's Meal plans tab (last 15 days) alongside date/time/recipe.

**`mealType`/`customTitle` (added 2026-08-23, `docs/specs/2026-round2-fixes.md` item 4):**
`mealType` is free text, not the old fixed 4-value enum — the plan builder's dropdown still offers
exactly Breakfast/Lunch/Snack/Dinner plus a client-only "Custom" option that reveals a free-text
input; whatever's typed there is what's actually saved as `mealType` (whether a saved meal is
"custom" is derived by checking it isn't one of the 4 fixed values, not a separate flag — same
convention `recipes.meal_type`'s own Custom category already uses). `customTitle` is a manually
typed recipe name, used instead of `recipe` when a slot's food isn't from the catalog. `recipe` and
`customTitle` are mutually exclusive — enforced by a DB `CHECK` on `plan_meals`
(`recipe_id IS NULL OR custom_title IS NULL`), not just validated in the request schema — a slot can
reference a catalog recipe, a manually typed one, or neither (still unfilled), but never both.
Every display surface (the client's Meals screen, the client Overview's next-meal card, and the
client profile's last-15-days table) resolves a meal's shown name as
`recipe?.title ?? customTitle ?? "<mealType> — recipe TBD"`.

`week`/`weekEnd` (2026-08-22): Week Start Date and Week End Date, captured once when the weekly diet
is assigned. `weekEnd` must be exactly 6 days after `week` (enforced server-side, `400` otherwise) —
the client auto-computes and locks it in the UI, so a dietitian never picks it independently. Both
are immutable after creation (`updatePlanSchema` has no `week`/`weekEnd` field). Existing rows from
before this change were backfilled with `weekEnd = week + 6 days`.

**"Published" — what it means for the email trigger (added 2026-08-23)**: purely the `published`
column's own `false`→`true` transition, detected in the controller
(`req.body.published === true && !existing.published`) — the same "genuine change, not every
autosave" idiom already used for a call's reschedule/cancellation detection. There's no revision
counter (unlike calls' `icsSequence`): an un-publish-then-republish of the same plan would only
notify once, ever, per plan id — not a supported UI flow today (no "Unpublish" action exists), so
this is a known, low-priority limitation rather than something actively handled. **Note**:
`published` does not currently gate a client's ability to *see* the plan at all — `GET /plans`
returns a plan regardless of its `published` value, so a client can already view a draft today. The
email's "ready to view" framing assumes otherwise; fixing that visibility gap is a separate,
pre-existing issue, out of scope for wiring the email trigger — see Known gaps.

## Recipes — `recipe.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/recipes` | dietitian, admin | `?mealType=&search=` → `[recipe]` |
| GET | `/recipes/:id` | dietitian, admin | → `{recipe}` |
| POST | `/recipes` | dietitian, admin | `{title, emoji?, mealType, prepTime, tags?, kcal?, protein?, ingredients, instructions}` → `{recipe}` |
| PATCH | `/recipes/:id` | dietitian, admin | partial fields → `{recipe}` |
| DELETE | `/recipes/:id` | dietitian, admin | → `204` |

`mealType` (labelled **"Category"** in the Create/Edit Recipe form) is free text, not a fixed enum
— the form offers Breakfast/Lunch/Dinner/Snack plus a "Custom" option that reveals a text input;
whatever value results is saved here as-is and appears as its own filter tab in the Recipe
Library (dynamically derived from whatever categories are actually in use, alongside the 4 fixed
ones). This is independent of `plan_meals`' own `mealType` — the weekly plan builder's slot-type
label — which stays the original fixed 4-value enum; a recipe's category has never constrained
which slot it can be dropped into.

## Calls — `call.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/calls` | Auth (own) | `?client=&from=&to=` (`client` further narrows a dietitian/admin's own results) → `[call]` (`dietitian`/`client` populated to `{_id, name}`) |
| GET | `/calls/available-slots` | client, dietitian, admin | `?date=YYYY-MM-DD&dietitian=&excludeCallId=` (client/dietitian: `dietitian` is derived, ignoring the query param; admin: `dietitian` required) → `{slots: [isoString]}` — every bookable 30-minute start on that UTC calendar day, computed live from the dietitian's availability (weekly hours + exceptions + existing calls). Pass `excludeCallId` when rescheduling so the call's own current slot doesn't count against itself. Purely informational — the real booking decision (and its 409) still happens on `POST`/`PATCH` |
| POST | `/calls` | client, dietitian, admin | client: `{scheduledAt, notes?, reminderMinutesBefore?}` (server derives `client`/`dietitian` from the caller's `assignedDietitian`, `400` if none set); dietitian: `{client, scheduledAt, notes?, reminderMinutesBefore?, force?}` (server sets `dietitian` to self); admin: `{client, dietitian, scheduledAt, notes?, reminderMinutesBefore?, force?}` → `{call}`. Validated against the dietitian's availability (see `/availability` below) — `409` on a conflict. `force: true` (dietitian/admin only, ignored for a client) bypasses the check |
| PATCH | `/calls/:id` | dietitian(own), admin, client(own) | client may only send `{scheduledAt?}` (reschedule), `{status: 'cancelled'}` (cancel), or `{reminderMinutesBefore?}` on a still-`scheduled` call — `403`/`400` otherwise; dietitian/admin → `{scheduledAt?, status?, notes?, reminderMinutesBefore?, force?}` → `{call}`. A `scheduledAt` change re-runs the same availability check as `POST` (same `force` rule) — cancelling, completing, or editing notes/reminders doesn't |
| DELETE | `/calls/:id` | dietitian, admin | → `204` |

**Booking/reschedule/cancellation email + calendar invite (added 2026-08-23, both-parties fix
2026-08-23)**: `POST /calls`, a genuine reschedule (`scheduledAt` actually changing), and a
cancellation (`PATCH {status: 'cancelled'}` on a not-already-cancelled call) each queue **two
separate emails — one to the client (or, for a not-yet-converted follow-up, the enquiry's contact),
one to the dietitian — never one email addressed or CC'd to both.** Each side has its own template
(`call-scheduled`/`call-rescheduled`/`call-cancelled` for the client; the same names with a
`-dietitian` suffix for the dietitian — see `server/src/services/callNotifications.js`), both
carrying the same `.ics` calendar attachment via `server/src/emails/ics.js`. The UID is
deterministic (`call-<callId>@nourishly.app`) and **stable for the appointment's entire life** — a
reschedule and a cancellation reuse it with `calls.ics_sequence` incremented, so a calendar client
updates or removes the one event it already imported instead of creating a second one. Booking/
reschedule send `METHOD:REQUEST`; cancellation sends `METHOD:CANCEL` + `STATUS:CANCELLED`. The
reschedule email also carries `previous_meeting_time` (the slot being moved *from*).

**Fires from the service layer, not the controller (2026-08-23)** — the actual bug this fixed:
`server/src/services/callService.js#bookCall`/`#applyCallUpdate` do the availability check,
transaction, `.ics` sequence bump, and notification; both `call.controller.js` (`POST`/`PATCH
/calls`) **and** `enquiry.controller.js`'s Follow-up transition call the *same* `bookCall(...)`.
Before this, Follow-up called the model directly and silently skipped the booking email entirely —
found while reading the trigger table against the actual code, not hypothesized. All sends go
through the same non-blocking path as every other email (see "Email notifications" below) — a
lookup failure, a template bug, or the mail provider being down can never fail the
booking/reschedule/cancel request itself, and one recipient's send failing never suppresses the
other's. The email's "meeting link" and the `.ics` `URL` both point back into the app
(`CLIENT_ORIGIN/app/calls`) — there is no real video-call/meeting-link feature in this app, so no
link is fabricated; the displayed meeting time is shown in the dietitian's own timezone (the only
IANA zone this app tracks — clients have none) for *both* recipients, explicitly labelled. Not
verified against a live database or a real calendar client this session — see
`docs/worklog/2026-08-23.md` Sessions 8–9.

Each call: `{client, enquiry, dietitian, scheduledAt, status, notes, reminderMinutesBefore,
icsSequence, consultationScheduleId, originalScheduledAt, rescheduledAt}`. `consultationScheduleId`
(added 2026-08-24, see the Consultation Schedule section below) is set only for a call generated
by a consultation schedule — `null` for every ad-hoc, manually booked one; `GET /calls` accepts it
as an optional filter, alongside a new optional `status` filter. **Exactly one of `client`/`enquiry` is ever set** (added
2026-08-23, `docs/specs/2026-round2-fixes.md` item 1) — `client` is `null` and `enquiry` populated
to `{_id, name, phone, email}` for a Follow-up call booked before the lead has a real account; the
reverse once converted. Only the enquiry pipeline (`PATCH /enquiries/:id` with `status:
'follow-up'`) ever creates an enquiry-linked call — the generic `POST /calls` here always requires
a real `client`, never an `enquiry`. The last two of the fields above (added 2026-08-22, spec §6)
are server-set, never client-supplied: a
reschedule updates the same row's `scheduledAt` in place rather than creating a new record, so
without them there'd be no trace a call was ever moved. `PATCH /calls/:id` stamps `rescheduledAt`
to "now" and, the first time only, copies the call's prior `scheduledAt` into
`originalScheduledAt`, whenever the new `scheduledAt` genuinely differs from the current one. The
client profile's Calls tab uses `rescheduledAt != null` to show a "Rescheduled" badge alongside
whichever of Upcoming/Previous/Completed/Cancelled the call currently falls into. `reminderMinutesBefore` (minutes,
or `null` for no reminder) drives an in-app pop-up reminder — see
`client/src/hooks/useCallReminders.js`, which polls the caller's own calls client-side and fires a
Sonner toast once per call when "now" enters its reminder window. No push notifications, no real
telephony integration — see "Known gaps" below. `useCalls()` (the main calls-list query) also polls
every 20s so a booking/reschedule by one party becomes visible to the other without a manual reload.

The recurring "Repeat call" auto-scheduling feature (`frequency`/`recurrenceParentId` columns,
`server/src/jobs/callScheduler.js`) was removed completely on 2026-08-22 — every call is one-off.
Booking now goes through a slot picker (`GET /calls/available-slots`) instead of a free-form
date/time input, so a doomed time can no longer be submitted in the first place. **Recurrence
returned 2026-08-24 in a deliberately different shape** — see the Consultation Schedule section
below for why (the old feature generated occurrences blind and lazily; the new one generates an
explicit, bounded, availability-checked batch instead).

**`server/src/services/callService.js` (added 2026-08-23, extended 2026-08-24)** is now the *only*
place a call is booked/rescheduled/cancelled — `bookCall`/`applyCallUpdate` — called by both
`call.controller.js` and `enquiry.controller.js`'s Follow-up transition (and, as of 2026-08-24,
`consultationScheduleService.js`'s occurrence generation/cancellation). `bookCall` accepts an
optional `consultationScheduleId`, threaded through to tag the created call.

**Availability validation (added 2026-08-22)**: `POST /calls` and `PATCH /calls/:id` (on a
`scheduledAt` change) run a fixed-30-minute-slot check — `server/src/services/availability.js`
(pure conflict logic) + `server/src/services/availabilityGuard.js` (fetches the dietitian's real
rows and takes a concurrency-safe row lock) — against, in order: any `kind: 'closed'` exception
covering the slot (`409`, "blocked"), the weekly template or a covering `kind: 'open'` exception
(`409`, "outside working hours" — skipped entirely if the dietitian has never configured any
weekly-hours rows, so this never silently locks out an existing dietitian), and any other
still-`scheduled` call for that dietitian overlapping the slot (`409`, "overlap" — back-to-back
appointments, where one ends exactly when the next starts, are allowed). The concurrent-booking
race (two requests for the same/overlapping slot at once) is closed with a real `SELECT ... FOR
UPDATE` range lock inside a transaction, not just an application-level check — see the comment in
`availabilityGuard.js` for the InnoDB locking details.

## Consultation Schedule — `consultationSchedule.routes.js` (added 2026-08-24)

A recurring "consultation schedule" per client — frequency, preferred day/time, start date, an
active/paused flag — stored as its own record (`consultation_schedules`, one row per client, NOT
loose fields on `users`) rather than the removed "Repeat Call" columns' approach. **One endpoint
pair, shared by the Admin Dashboard and the Dietitian Portal alike** — role checks
(`assertDietitianOwnsClient`, the same rule `plan.controller.js` already uses) happen inside the
controller, not via two separate route files or two separate frontend implementations. The
dietitian is deliberately **never stored on the schedule** — always read live from the client's
current `assignedDietitian`, so reassigning a client to a different dietitian is picked up
automatically rather than needing the schedule edited too.

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/consultation-schedule?client=` | admin, dietitian(own client) | → `{schedule, gaps[]}` — `schedule` is `null` if none exists yet |
| PUT | `/consultation-schedule` | admin, dietitian(own client) | `{client, frequencyDays, preferredWeekday, preferredTime, startDate, active, regenerateFutureCalls?}` → `{schedule, dietitianAssigned, warning, generated[], gaps[], cancelled[]}` |

`frequencyDays` collapses the UI's "Every 7 days / Every 14 days / Custom N days" into one integer
(1–90) — there's no separate "which preset" column. `preferredWeekday` is `0`=Sunday..`6`=Saturday,
the same convention `dietitian_weekly_hours.weekday` already uses. `preferredTime` is wall-clock in
the dietitian's own timezone (same convention as `dietitian_weekly_hours.start_time`/`end_time`),
not a raw UTC time. `active: false` is the paused flag.

**No dietitian assigned yet**: saving is still allowed (`dietitianAssigned: false` in the
response) — the config stores, but nothing is validated or generated until a dietitian exists. The
common enquiry-conversion path never assigns one at creation time, so this is a real, expected
state, not an edge case.

**The working-hours warning** (`warning`, a string or `null`) is a **soft** check, computed at save
time by reusing `server/src/services/availability.js#checkAvailability` directly against a
synthetic "next occurrence of this weekday/time" instant, with no exceptions/existing calls passed
in — the only possible non-ok reason left is `outside_hours`, which becomes this warning. It never
blocks the save; the **real**, per-occurrence hard check is `assertSlotAvailable` inside `bookCall`
when an occurrence actually gets generated (which can still reject an individual date for a reason
the general warning can't see, e.g. a specific-date exception or an overlap — see `skipped` below).

**Generation: a rolling 60-day window, kept topped up by a recurring job (added 2026-08-24) — the
direct opposite of how "Repeat Call" actually failed.** "Repeat Call"
(`docs/worklog/2026-08-22.md`) generated occurrences *lazily*, one at a time, only after the
previous one's time had already passed, with **zero availability checking** (it predates the whole
working-hours system) — there was never a real, inspectable list of "upcoming calls from this
schedule." This feature's whole point is that there now is one
(`calls.consultation_schedule_id`), and generation is the opposite of lazy/blind:
`server/src/services/consultationScheduleService.js#generateForSchedule` computes every occurrence
instant from the schedule's pattern out to `now + 60 days` (`ROLLING_WINDOW_DAYS`), and for each one
not already accounted for, books it through the real, availability-checked
`callService.js#bookCall` — never a blind insert. A real scheduling conflict (blocked date, outside
hours, overlap) is recorded as a **gap** (`consultation_schedule_gaps`, a durable row — see below)
rather than aborting the rest of the run; a non-scheduling error is not swallowed as a gap, it
propagates.

**Idempotent by construction, using an existing column — no run-tracking table needed.** An
occurrence's identity is `COALESCE(calls.original_scheduled_at, calls.scheduled_at)` — the *first*
instant that row was ever scheduled for, which `original_scheduled_at` already preserves across any
later reschedule. Before generating instant `D`, the generator checks whether any call for this
schedule (**any** status — scheduled, rescheduled away, cancelled, completed) already claims `D`,
or a gap already does. Either way, `D` is skipped — already handled. This is what makes rerunning
the job safe (no duplicates, ever), and what makes an individual reschedule or cancellation via the
normal `PATCH /calls/:id` permanent: that call keeps `consultation_schedule_id` set, so its instant
stays claimed forever and the next run never re-fills it. **`regenerateFutureCalls` is the one
deliberate exception**: cancelling for a regenerate also *detaches* each call
(`consultation_schedule_id → NULL`) — otherwise a regenerate that lands back on a date the old
pattern also used (e.g. switching 7-day → 14-day, which shares every other date) would find that
date still "claimed" by the now-cancelled row and silently fail to refill it. `updateCallSchema` has
no `consultationScheduleId` field at all, so this detachment is only ever reachable from the
regenerate path, never from an ordinary call edit.

**Notification batching**: a run producing more than one new call (the initial window fill, or
right after a regenerate) sends **one** summary email (`consultation-schedule-generated`/
`-dietitian`) instead of a burst — the dietitian's copy also names the new gap count, if any. A run
producing exactly **one** new call (the normal steady-state top-up as the window rolls forward) gets
the ordinary `call-scheduled` email as if it had been booked directly — indistinguishable from any
other single booking.

**The job**: `server/src/services/consultationScheduleJob.js#startConsultationScheduleJob`, an
in-process `setInterval` (no new dependency — the same pattern as the email queue worker,
`server/src/emails/worker.js`), default every 24h (`CONSULTATION_SCHEDULE_JOB_INTERVAL_MS`), plus
one run immediately at server startup. It iterates every `active` schedule, resolves the client's
*current* `assignedDietitian` (skips if none), and calls `generateForSchedule` — one schedule's
failure is caught and logged, never aborting the rest of the run.

**Occurrence math**: the first occurrence anchors to the next date ≥ `startDate` that falls on
`preferredWeekday`; every occurrence after that is simply `+ frequencyDays` from the previous one —
**not** re-anchored to `preferredWeekday` each time. For 7/14-day frequencies (multiples of 7) this
keeps every occurrence on the same weekday forever. A custom, non-multiple-of-7 frequency will
drift across weekdays over time — the mathematically honest result of "every N days" when N isn't a
week-multiple, not masked by silently re-snapping to the weekday. Verified directly (not just
reasoned about): a 10-day frequency over a 60-day window correctly cycles through every weekday.

**Editing and `regenerateFutureCalls`**: a save with `regenerateFutureCalls: true` — or the
schedule's very first save — cancels+detaches every still-`scheduled`, still-future call this
schedule already produced (via the real `applyCallUpdate` cancellation path, so a real cancellation
email/`.ics` fires for each) and immediately refills the rolling window from the new pattern, unless
the schedule is paused (`active: false`), which cancels but generates nothing. **Without** that
flag, an edit changes only the stored config — already-booked future calls are left completely
alone. The client is expected to show the currently-affected calls
(`GET /calls?client=&consultationScheduleId=&status=scheduled`) and ask before setting the flag,
rather than deciding silently — see `client/src/components/portal/shared/ConsultationScheduleTab.jsx`.

**`consultation_schedule_gaps` (new table)**: `{id, consultationSchedule, occurrenceAt, reason,
createdAt}` — one durable row per occurrence a generation run couldn't place. Read via the `gaps`
array in `GET /consultation-schedule`'s response (joined by schedule, not a separate endpoint).
This — together with the "Upcoming series" list — is the "admin view of a client's upcoming
generated series and any occurrences that couldn't be placed," rendered by
`ConsultationScheduleSeriesLists.jsx` inside the same shared Settings tab.

**One shared component, two entry points into it**: `client/src/components/portal/shared/
ConsultationScheduleTab.jsx` is rendered as a new "Settings" tab on `ClientProfileScreen.jsx` —
already the one shared client-detail screen both the Admin Dashboard and the Dietitian Portal land
on (no second screen needed). The same underlying fields
(`ConsultationScheduleFields.jsx`) are also embedded directly in both client-creation flows
(`UserFormDialog.jsx`'s admin Add User dialog, and `EnquiryConvertedDialog.jsx`'s Convert flow),
behind a "Set up a consultation schedule now" checkbox, so the very first save can happen at
creation time — a follow-up `PUT` after the account itself is created, non-blocking (the account
exists either way; a schedule-save failure only surfaces its own toast).

## Availability — `availability.routes.js`

Weekly hours now has an admin-on-behalf-of path (added 2026-08-23,
`docs/specs/2026-round2-fixes.md` item 2 — the new Edit Dietitian page's Working hours tab).
Exceptions remain dietitian self-service only, deliberately not extended to admin.

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/availability/weekly-hours` | dietitian, admin | dietitian: → the caller's own template; admin: `?dietitian=<id>` (required, `400` if missing or not a real `role:dietitian` id) → that dietitian's template — `[{weekday, startTime, endTime}]`, one row per open weekday (0=Sunday..6=Saturday); no rows at all means "never configured," not "closed every day" (see the Calls note above) |
| PUT | `/availability/weekly-hours` | dietitian, admin | dietitian: `{days: [{weekday, startTime, endTime}]}`; admin: `{dietitian, days: [...]}` (whole-template replace — delete all + reinsert, max 7 rows, no duplicate weekday, `endTime > startTime`) → `[{weekday, startTime, endTime}]` |
| GET | `/availability/exceptions` | dietitian | `?from=&to=` → `[{startAt, endAt, kind, note}]` — `kind` is `'closed'` (blocks a date, a time within a day, or a multi-day holiday/personal period — all the same shape at different spans) or `'open'` (grants hours outside/instead of the weekly template, e.g. an extra Saturday) |
| POST | `/availability/exceptions` | dietitian | `{startAt, endAt, kind, note?}` (`endAt > startAt`) → `{exception}` |
| DELETE | `/availability/exceptions/:id` | dietitian | → `204` — no update endpoint; the client deletes and recreates a row instead of editing one in place |

The admin path reads/writes through the exact same `dietitian_weekly_hours` table and the same
model functions (`listWeeklyHours`/`replaceWeeklyHours`) the dietitian's own self-service form and
the booking engine's own availability check (`server/src/services/availability.js`) already use —
there is no second copy of this data or logic; the client's `WeeklyHoursForm.jsx` component itself
is reused unmodified for both the dietitian's own Availability screen and the admin's Edit
Dietitian page, just given a different `dietitianId` prop.

**Timezone rule (fixed 2026-08-23 — see `docs/specs/2026-round2-fixes.md` item 7 for the bug):**
`weekly-hours[].startTime`/`endTime` are wall-clock values in the dietitian's own `users.timezone`
(IANA name, e.g. `"Asia/Kolkata"`) — exactly what they typed into the time picker, with no UTC
conversion applied at rest. `exceptions[].startAt`/`endAt` and every `calls.scheduled_at` are, and
have always been, real UTC instants (unambiguous — comparing two instants needs no timezone). The
bug was that `checkAvailability` (`server/src/services/availability.js`) compared a candidate
slot's *UTC* hour directly against the raw `startTime`/`endTime` strings, silently treating
dietitian-local wall-clock input as if it were already UTC — a client would see slots shifted by
exactly the dietitian's UTC offset (e.g. a 9-5 schedule appearing as ~4:00 AM-11:30 AM for a
dietitian in a UTC-5 zone). Fixed by converting exactly once, via `date-fns-tz`'s
`toZonedTime`/`fromZonedTime` (DST-aware — no manual offset arithmetic anywhere), at the one point
that actually needs a timezone: turning a candidate UTC instant into "what wall-clock time/weekday
is this in the dietitian's zone." `GET /calls/available-slots?date=` now means the dietitian's
local calendar date (not a UTC one) — `listAvailableSlots` resolves that date's real UTC start/end
via `fromZonedTime` rather than a fixed `+24h`, so DST-transition days aren't silently truncated.
Every existing dietitian defaults to `timezone: "UTC"` (see the Users section above) — until they
set their real zone, behavior is byte-for-byte identical to before this fix, so introducing the
column never retroactively relocates anyone. Client-side, `SlotPicker.jsx` labels the browser's own
timezone next to the slot grid (`client/src/lib/timezone.js`) — the one display-boundary
conversion (UTC instant → viewer's local time via `toLocaleTimeString`) was already correct before
this fix; only the write-side comparison was wrong.

## Progress — `progress.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/progress` | Auth (own) | `?client=` (dietitian: only their assigned client, `403` otherwise; admin: any) → `[progress]` |
| POST | `/progress` | client | `{date, weight, waist?, hip?, thigh?, upperArm?, energy?, adherence?}` → `{progress}` |
| PATCH | `/progress/:id` | client(own), admin | → `{progress}` |
| DELETE | `/progress/:id` | client(own), admin | → `204` |

`waist`/`hip`/`thigh`/`upperArm` (cm) are all optional per entry, independent of each other and of
`weight` — a client can log any subset. History is append-only in the UI (no edit affordance on
past entries); `PATCH`/`DELETE` exist for admin correction only.

## Client Notes — `clientNote.routes.js` (added 2026-08-22)

Free-standing notes about a client — spec §6 item 6, deliberately separate from `calls.notes`
(tied to one call) and `reports.note` (tied to one report). Every route requires role `dietitian`
or `admin`; a dietitian is scoped to their own assigned clients (`403` otherwise via
`assertDietitianOwnsClient`, same helper `/progress` and `/plans` already use), admin can access
any client's notes.

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/client-notes` | dietitian(own client), admin | `?client=` (required) → `[note]`, newest first |
| POST | `/client-notes` | dietitian(own client), admin | `{client, body}` → `{note}` (`author` set to the caller) |
| PATCH | `/client-notes/:id` | author, admin | `{body}` → `{note}` — `403` for any other dietitian, even one assigned to the client |
| DELETE | `/client-notes/:id` | author, admin | → `204` |

Each note: `{client, author, authorName, body, createdAt, updatedAt}`.

## Messages — `message.routes.js` (added 2026-08-22)

Client <-> assigned dietitian messaging (spec §1.5). Every route requires role `client` or
`dietitian` — **admin is excluded entirely** (`403`), since admin isn't a party to any
conversation. Conversation identity is the `(client, dietitian)` pair itself — there is no
separate conversations resource — and it is always re-derived server-side from the *current*
`assignedDietitian` relationship, never trusted from a request param: a client caller can never
specify who they're messaging (always their own assigned dietitian, `400` if none set), and a
dietitian caller must specify `client`, and can only ever address one they're currently assigned
to (`403` via `assertDietitianOwnsClient` otherwise — the one enforcement point every route below
shares, so there's exactly one place this check can be gotten wrong, not five). If a client is
later reassigned to a different dietitian, the old thread becomes inaccessible to both the old
dietitian (no longer owns the client) and the client (their own lookup now resolves to the new
dietitian) — a conversation is scoped to the relationship, not preserved as a historical record.

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/messages` | client(own), dietitian(own client) | client: none; dietitian: `?client=` (required) → `[message]`, oldest first (chat order) |
| POST | `/messages` | client(own), dietitian(own client) | client: `{body}`; dietitian: `{client, body}` → `{message}`, `201` |
| POST | `/messages/read` | client(own), dietitian(own client) | client: `{}`; dietitian: `{client}` → `204` — marks every message in the conversation not sent by the caller as read; call when a thread is opened |
| GET | `/messages/unread-count` | client, dietitian | → `{count}` — client: unread in their one conversation; dietitian: total across every conversation (see `/conversations` for the per-conversation breakdown) |
| GET | `/messages/conversations` | dietitian only | → `[{client: {_id, name}, lastMessage: {body, sender, createdAt} \| null, unreadCount}]` — one row per currently-assigned client (even with zero messages, so a dietitian can start one), ordered most-recently-active first then alphabetically |

Each message: `{client, dietitian, sender, body, readAt, createdAt}`. `readAt` is a single
timestamp (not per-party) since a 1:1 thread's each message has exactly one possible reader — the
sender never needs to "read" their own message. No edit/delete — a chat history is immutable.
Polling only (`refetchInterval`, 15s on the thread/conversation list, matching the cadence already
used for calls/reminders) — no websocket infrastructure was added, per the spec's explicit steer.

## Reports — `report.routes.js`

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/reports` | Auth (own) | `?client=` (dietitian: only their assigned client, `403` otherwise; no `?client=` defaults to all of the dietitian's own clients; admin: any/all) → `[report]` (`client` populated to `{_id, name}`, each has a `feedback[]` thread) |
| POST | `/reports` | client | `multipart/form-data {file, note?}` → `{report}` (status `pending`) |
| GET | `/reports/:id/file` | client(own), dietitian(own client), admin | → the uploaded file's raw bytes, `Content-Type` inferred from its extension, `Content-Disposition: inline` — same per-role ownership rule as `GET /reports` (`403` otherwise), `404` if the report or the on-disk file doesn't exist |
| POST | `/reports/:id/feedback` | dietitian, admin | `{message, status?}` → `{report}` — appends one entry to `feedback[]` and sets `status` (default `reviewed`) |
| DELETE | `/reports/:id` | client(own), admin | → `204` |

Each report: `{client, fileName, filePath, note, status, feedback: [{author, authorName, message, createdAt}]}`.

**File serving (fixed 2026-08-23, `docs/specs/2026-round2-fixes.md` item 6):** uploaded files used
to be served by a plain `express.static` mount at `/uploads` — reachable by anyone with the URL,
with no authentication or ownership check at all. That mount is gone; every file now goes through
`GET /reports/:id/file` above, sitting behind the same `authenticate`/`blockIfMustChangePassword`
stack and the same per-role ownership rule as the rest of this router. The response also sets
`Cross-Origin-Resource-Policy: cross-origin` (overriding helmet's app-wide `same-origin` default
for this one route) — without it, the browser blocks the client app from loading the file at all
whenever client and server are on different origins (Netlify vs. Render in production), even
though CORS itself allows the request through; this is a distinct browser mechanism from both CORS
and CSP, and was the real cause behind "documents fail to load" in a cross-origin deployment. The
client never points an `<img>`/`<iframe>` directly at this URL — it fetches the file as an
authenticated blob (`axiosClient`, `responseType: 'blob'`) and renders a local `blob:` URL instead,
so no unauthenticated or cross-origin-unfriendly direct link is ever exposed. `filePath` is stored
as a server-generated on-disk filename only (never trust-worthy as a public path); `upload.js` also
now runs the client-supplied original filename through `path.basename` before using it to name the
saved file, closing a latent path-traversal write that existed alongside the same bug (an
`originalname` containing `../` could otherwise have written outside the uploads directory).

## Email notifications — `emailLog.routes.js` (added 2026-08-23)

`server/src/emails/sendEmail.js` is the one entry point
(`sendEmail(to, templateKey, params, {idempotencyKey?, relatedEntity?})`); it only enqueues a row
in `email_log` and returns — an in-process worker (`server/src/emails/worker.js`, started from
`server.js`, polling every `EMAIL_QUEUE_POLL_INTERVAL_MS`ms) claims and actually sends, retrying
with exponential backoff up to `EMAIL_MAX_ATTEMPTS` before marking a row `failed`. Templates live as
files under `server/src/emails/templates/<key>/`, each with
`subject.txt`/`body.html`/`body.text.txt`; every interpolated value is HTML-escaped in `body.html`.
Transport is Resend in production (`RESEND_API_KEY` required, checked at boot) and an enforced
console/file transport (`server/.local/emails/`) everywhere else — setting `EMAIL_TRANSPORT` to
anything but `console` outside production is a startup error, not a silent override. Manual test
tool: `node src/scripts/sendTestEmail.js <templateKey> <to>` (`npm run test:email`).

**Every trigger is wired up as of 2026-08-23** (see the Enquiries/Users/Plans/Calls sections above
for each one's own details): enquiry submitted, client account created, plan published, call
booked/rescheduled/cancelled (the last three as two separate emails, client + dietitian). All 9
templates: `enquiry-acknowledgment`, `client-welcome`, `plan-published`,
`call-scheduled`/`call-rescheduled`/`call-cancelled` (client-facing) and their `-dietitian`
counterparts. The 6 call templates each carry a `.ics` calendar-invite attachment, built by
`server/src/emails/ics.js` (via `ical-generator`) from an `ics` sub-object nested in the template's
`params` — see the Calls section above for the UID-stability/SEQUENCE rules that make a
reschedule/cancellation update the same calendar event instead of duplicating it, and for why
booking/reschedule/cancel fire from a `services/*.js` layer shared across controllers rather than
being inlined per-controller. The attachment's content-type carries `method=REQUEST`/
`method=CANCEL` and is a real named `.ics` file at the same time, so one attachment (not two
representations) is what Gmail's invite-detection and Outlook's plain-attachment expectation both
key off.

Idempotency keys always include enough to distinguish one legitimate send from the next
(recipient role for calls, the plan/enquiry/user id for the single-recipient ones) — see each
trigger's own section above for its exact key shape. Every notifier function
(`server/src/services/*Notifications.js`) is entirely wrapped in try/catch and only ever called
after its underlying action has already succeeded in the database — a notification failure can
never undo or block the enquiry/account/plan/call action itself, only get logged
(`console.error`) and left visible in the log below.

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/emails` | admin | `?status=queued\|sending\|sent\|failed` → `[emailLog]` |
| GET | `/emails/:id` | admin | → `{emailLog}` (includes `error`, `attempts`, `providerMessageId`) |
| POST | `/emails/:id/resend` | admin | → `{emailLog}` — `400` unless the row is currently `failed` (a queued/sending row is already going to be picked up on its own; resending a `sent` row would be a real duplicate delivery). Resets `attempts` to `0` (a fresh budget) and drains the queue immediately rather than waiting for the next poll interval. Added 2026-08-23 alongside a new admin **Email log** screen (`/app/email-log` — not in CLAUDE.md §5's fixed admin screen list, added because this was explicitly asked for) |

## Company — `company.routes.js` (added 2026-08-28)

The tenant's own company record, as **mirrored from ZenX admin-server** on each SSO handoff
(`auth.controller.js#handoff` → `models/Company.js#upsertCompanyFromHandoff`). Read-only here by
design: ZenX owns company identity, so there is no create/update/delete endpoint — an edit made
here would be overwritten on the org's next sign-in. `website` arrives already normalised to
include a scheme (admin-server's `provisioning.controller.js#normalizeWebsite`).

| Method | Path | Auth | Payload → Response |
|---|---|---|---|
| GET | `/company/me` | any role | → `{company: {id, name, slug, website, logoUrl} \| null}` — scoped to `req.user.companyId`, never a client-supplied id. `null` (not 404) for an account whose company was never mirrored, so the UI falls back to default Nourishly branding instead of erroring |
| GET | `/company/public/:slug` | **Public** | → `{company: {name, slug, logoUrl} \| null}` — branding for a slug-scoped login page (`/:companySlug/login`). Deliberately omits `website` and every contact field; returns `null` rather than 404 for an unknown slug so it can't be used to enumerate which slugs exist |

## Insights — `insights.routes.js`

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/insights/admin-overview` | admin | `{newEnquiries, followUpsToday, conversionRate, activeClients, growthSeries: [{week, enquiries}] (last 8 weeks, real aggregation, zero-filled), dietitianWorkload: [{dietitian, clients}], statusBreakdown: [{status, count}]}` |
| GET | `/insights/dietitian-overview` | dietitian | `{todaysAppointments[], attentionItems[], clientMomentum}` |

## Known gaps (flagged, not silently decided)

- Consultation schedule (2026-08-24, generation rewritten from a fixed 6-call batch to a rolling
  60-day window + recurring job — see the section above): a gap
  (`consultation_schedule_gaps`) is a permanent record once created — nothing currently re-attempts
  a flagged date automatically if the underlying conflict later clears (e.g. an exception is
  removed), and there's no "resolve"/dismiss action on a gap, only visibility. A custom,
  non-multiple-of-7 frequency drifts across weekdays over time by design, not a bug. Pausing/editing
  never touches already-booked calls unless `regenerateFutureCalls` is explicitly set — including a
  genuine pause, which by itself changes nothing about existing calls. The job interval (default
  24h) means a brand-new schedule's initial fill happens immediately (triggered synchronously by
  the save itself, and once more at server startup), but an already-existing schedule's window only
  gets topped up on the job's own cadence, not instantly as time passes.
- `Report` file storage is local disk (`server/uploads/`) for now — swap for S3 when decided.
- `attentionItems` on `/insights/dietitian-overview` still returns an empty placeholder — the
  dietitian-side overview dashboard itself is still unbuilt (Phase 5 placeholder), so there's no
  UI consuming this yet. `admin-overview`'s `growthSeries` is real as of Phase 8.
- Call reminders (2026-08-19) are still explicitly a testing-stage feature: client-side polling +
  an in-app toast only, not a push notification or an actual phone call. (The recurring
  "Repeat call" auto-scheduling half of that 2026-08-19 work was removed completely on 2026-08-22
  — see the Calls section above.)
- Availability (2026-08-22): a requested slot must fit entirely inside one continuous window — the
  weekly template's window for that day, or one covering `open` exception — they aren't merged, so
  e.g. a template ending at noon plus a same-day `open` exception starting at noon wouldn't be
  treated as one continuous window for a slot straddling noon. `start_time`/`end_time`/`start_at`/
  `end_at` are UTC wall-clock, the same convention `calls.scheduled_at` already uses. Weekly hours
  gained an admin-on-behalf-of path 2026-08-23 (see the Availability section above); exceptions are
  still dietitian self-service only.
- No repo-wide automated test suite — `server/tests/` (added 2026-08-22, `node --test`) covers only
  the new availability service: `npm run test:unit` is pure-logic and DB-free, `npm test` also runs
  a real-MySQL integration test for the concurrent-booking race and needs a local database matching
  `server/.env`.
- Program Plans (2026-08-22) has no admin-on-behalf-of-a-dietitian editing concept and no delete
  endpoint — matches the spec's literal "create, edit, activate/deactivate" scope.
- `accountStatus` (2026-08-23): `inactive`/`suspended` block nothing except login (see the Users
  section above for the full explanation) — a suspended/inactive dietitian's existing clients,
  calls, and plans are untouched, and they still appear in the dietitian picker
  (`GET /users?role=dietitian`) a new/unassigned client uses to self-assign. Filtering that picker
  by status was deliberately deferred, not solved silently.
- Email notifications (2026-08-23): all 6 triggers are wired up (enquiry submitted, client account
  created, plan published, call booked/rescheduled/cancelled). Admin resend exists now
  (`POST /emails/:id/resend`, only from `failed`) via a new **Email log** admin screen. Not real
  end-to-end verified against a live database, a real mail send, or an actual calendar client any
  session so far — see the Email notifications/Enquiries/Users/Plans/Calls sections above and
  `docs/worklog/2026-08-23.md` Sessions 7–9.
- Meeting link (2026-08-23): there is no real video-call/meeting-link feature in this app. The call
  emails' "meeting link" and the `.ics` `URL` both point back at `CLIENT_ORIGIN/app/calls` (the
  Calls list, not a per-call deep link — none exists) rather than a fabricated video-call URL.
  `meeting_time` is shown in the dietitian's own timezone, explicitly labelled — clients have no
  timezone of their own in this app's data model.
- Plan-published visibility (2026-08-23): `published` on a `plans` row does not currently gate
  `GET /plans` at all — a client can already see a draft plan today, so the new `plan-published`
  email's "ready to view" framing is aspirational rather than strictly accurate. This is a
  pre-existing gap, not introduced by the email trigger and not fixed here — see the Plans section
  above.
- Plan-published re-publish (2026-08-23): the `plan-published` email's idempotency key has no
  revision counter (unlike calls' `icsSequence`) — an un-publish-then-republish of the same plan
  (not a supported UI flow today; there's no "Unpublish" action) would not trigger a second email.
- Enquiry pipeline (2026-08-22): a client created via "Converted" (not "Follow-up") gets no
  dietitian assignment — they self-assign one after first login via the existing
  `DietitianPickerDialog`, same as any other admin-created, unassigned client. The weekly plan
  builder's own slot-type dropdown (Breakfast/Lunch/Snack/Dinner) is intentionally unrelated to a
  recipe's (now free-text) category, and stays a fixed 4-value enum.
