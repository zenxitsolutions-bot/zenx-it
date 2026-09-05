# Progress

Last updated: 2026-08-28 (company-slug URLs — every logged-in user's URL now carries their own
company's name, e.g. `/acme-corp/app/overview`, instead of the same generic `/app/overview` for
everyone; also the first live, in-browser verification of 2026-08-27's multi-tenancy work).
For the detailed day-by-day build journal, see `docs/worklog/` — this file is the current-state
summary; the worklog is the history.

**Update, 2026-08-28: company-slug URLs, and the multi-tenancy SSO handoff verified live for the
first time.** Yesterday's multi-tenancy work had never been run against a real browser — doing so
today surfaced and fixed three real bugs: dev-server port drift silently breaking every cross-app
URL (now pinned with `strictPort`), a brand-new ZenX company's first handoff failing on a missing
local `companies` row (now upserted on every handoff), and every seeded demo user having a `NULL`
`company_slug` (backfilled, and fixed at the source in both `seed.js` and `migrate.js`). Once that
was working, added company-slug URLs: the whole `/app/*` tree now lives under `/:companySlug`, with
a guard that bounces a mismatched slug back to the logged-in user's own (not a new security
boundary — every controller already scopes by `req.user.companyId` regardless of the URL) and a
redirect that keeps old bare `/app/...` bookmarks working. Full detail in
`docs/worklog/2026-08-28.md`.

**Update, 2026-08-27: shared ZenX auth → real organization isolation.** ZenX's admin-server already
had a working shared-auth backbone (companies/customers/RBAC, SSO handoff) and this app already
received it, but had zero tenant scoping of its own — one flat pool of users/data, `admin` global
platform-wide. Added `company_id` to the three top-level owner tables (`users`, `enquiries`,
`program_plans`); every other table is scoped transitively through its owning user. `handoff` now
carries the token's `company_id`/role through instead of discarding them (a ZenX company contact
becomes this app's org `admin`, not a hardcoded `dietitian`). Existing pre-multi-tenancy data
backfilled onto one real, ZenX-managed "Legacy Practice" company — see
`docs/worklog/2026-08-27.md` for the full breakdown, including several `admin`-bypasses-everything
gaps found and closed along the way (client notes, progress, plans, calls, availability, email log)
that a list-endpoint-only pass would have missed. Not verified against a live database this
session — no local MySQL reachable; still needs the two-company SSO handoff runbook run for real.

**Update, 2026-08-24 (session 2): consultation schedules now generate real, ongoing appointments —
a rolling 60-day window instead of the one-time 6-call batch from earlier today.** A recurring
background job (no new dependency, same in-process pattern as the email queue) keeps every active
schedule's window topped up, and every occurrence still goes through the real availability check —
a blocked date, an outside-hours slot, or an existing appointment gets flagged for a human to
resolve rather than silently skipped or silently moved to a different time. Rerunning generation is
provably safe: it reuses a column that already tracked a call's original booking time, so an
individually rescheduled or cancelled call is never recreated by the next run. That same mechanism
had a real gap in it, caught before it shipped by simulating the numbers directly rather than
trusting the reasoning: regenerating a schedule after a frequency change could silently produce zero
new calls whenever the new pattern reused any of the old one's dates. Fixed by having a regenerate
explicitly free up the dates it cancels, while an individual cancellation never does — so a person's
own action on one appointment stays permanent, but a deliberate full reset actually resets. Setting
up a schedule now sends one summary email instead of a burst of individual booking confirmations,
and the admin Settings tab shows both the upcoming series and anything that couldn't be scheduled.
Not verified against a live database this session — no local MySQL reachable, the same situation as
most sessions this week; the trickiest logic (the occurrence math and the idempotency fix) was
verified directly through simulation instead. Full account in `docs/worklog/2026-08-24.md`'s
Session 2.

**Update, 2026-08-24: clients can now have a recurring consultation schedule — frequency, preferred
day/time, start date, active/paused — set at creation and editable later from one shared screen on
both portals.** Before writing any code, dug into why a similar "Repeat Call" feature had been
built and then completely removed a few days earlier: it generated future calls lazily, one at a
time, only after the previous one had already passed, with zero regard for the dietitian's actual
working hours (it predates that whole system). The new design is the direct opposite on purpose —
saving a schedule generates an explicit, bounded batch of 6 upcoming calls right away, each one
individually checked against real availability and individually booked (with its own confirmation
email and calendar invite) through the same booking machinery every other call in the app uses.
Editing a schedule that already has upcoming calls asks first — regenerate them to match the new
settings, or leave them exactly as they are — rather than ever silently rewriting or orphaning a
booking. A slot outside the dietitian's working hours gets a warning at save time, not a block. The
client-detail page turned out to already be shared between the Admin Dashboard and the Dietitian
Portal, so the new "Settings" tab just works for both without needing a second version built. Not
verified against a live database this session — no local MySQL reachable, the same situation as
most sessions this week; verified the trickiest part directly instead (the occurrence-date math,
including a custom day-count that deliberately drifts across weekdays over time, by design). Full
account in `docs/worklog/2026-08-24.md`.

**Update, 2026-08-23 (session 9): every planned email notification now actually fires, and calls
notify both the client and the dietitian, never just one.** Submitting a public enquiry, creating a
client account (either via admin or via converting an enquiry), publishing a weekly plan, and
booking/rescheduling/cancelling a call all now queue the right email. Found and fixed a real bug
along the way: the enquiry pipeline's "Follow-up" call booking called the database layer directly,
completely bypassing the booking-email logic added last session — a call booked that way got no
email at all. Fixed by moving call booking/rescheduling/cancelling into a proper shared service
(`callService.js`) that both the direct Calls API and the enquiry pipeline now call, so the
notification can never again be skipped just because a different part of the app triggered it. Call
emails also now go to the dietitian as well as the client — two separate emails, never one CC'd to
both — a gap from last session that the actual trigger list surfaced. Every notification is
non-blocking and independently logged: a booking, account, or plan action always succeeds even if
its email fails. Also shipped: an admin "Email log" screen with per-status filtering and a Resend
button for anything that failed. Not verified against a live database, a real send, or an actual
calendar client this session — no local MySQL reachable, the same situation as most of this week;
verified everything else directly (every one of the 9 email templates rendered with real sample
data, the existing test suite, a clean client build). Full account in
`docs/worklog/2026-08-23.md`'s Session 9.


**Update, 2026-08-23 (session 8): booking, rescheduling, and cancelling a call now sends a real
email with a calendar invite attached — one .ics generator shared by all three.** The invite's UID
is deterministic (`call-<callId>@nourishly.app`) and never changes for the life of an appointment;
a reschedule or cancellation reuses it with a new `calls.ics_sequence` (a new column, starts at
`0`, incremented on every state change), so a calendar client updates or removes the one event it
already imported instead of ending up with duplicates — the exact failure mode most .ics
integrations run into. Booking/reschedule send `METHOD:REQUEST`; cancellation sends
`METHOD:CANCEL` + `STATUS:CANCELLED`. Uses `ical-generator` (new dependency, chosen over
hand-rolling after weighing it directly) for RFC 5545-correct line-folding/escaping — verified the
actual generated output directly (UID stability, incrementing SEQUENCE, proper `...Z` UTC instants,
no floating times). There's no video-call/meeting-link feature in this app at all, so rather than
invent one, the email's "meeting link" and the `.ics` `URL` both point back into the app itself; the
meeting time is shown in the dietitian's own timezone (the only IANA zone this app tracks) since
clients have none. All three emails go through the existing non-blocking queue from session 7's
notification engine — a lookup failure, a template bug, or the mail provider being down can never
fail the booking/reschedule/cancel request itself. Not verified against a live database or a real
mail client this session (same DB-unreachable situation as most sessions this week) — generated a
realistic booked→rescheduled→cancelled `.ics` trio and handed it directly to the user to import into
a real calendar client, since driving an actual mail/calendar app isn't something this session can
do on its own. Full account in `docs/worklog/2026-08-23.md`'s Session 8.


**Update, 2026-08-23 (session 7): built the plumbing for outbound email — transport, templates,
queue/retry, idempotency, admin visibility — with nothing wired up to trigger a real send yet.**
`docs/specs/scheduling-email-system.md` (referenced in the ask) doesn't exist in the repo, so this
was built from the requirements given directly rather than a spec file. One `sendEmail(to,
templateKey, params)` entry point only ever writes a queued row to a new `email_log` table (which
doubles as the audit log); an in-process worker polls it (`SELECT ... FOR UPDATE SKIP LOCKED`, the
same idiom already used for booking-conflict locking) and does the actual sending, retrying with
exponential backoff before marking a row `failed` — so a slow or failing mail provider can never
block a request path like a booking. Provider is Resend (already integrated for password-reset
email) in production, with a hard-enforced console/file transport everywhere else — explicitly
setting the real transport outside production is a startup error, not just a default that could be
overridden. Three templates (`client-welcome`, `plan-assigned`, `call-scheduled`) live as files,
HTML-escaped, covering every placeholder asked for. `sendEmail()` accepts an idempotency key so a
retried job or a double-fired handler can never send the same email twice. Not verified against a
live database this session — no local MySQL reachable; verified everything else (transport guard,
template rendering/escaping/validation, existing test suite, clean app boot). Full account in
`docs/worklog/2026-08-23.md`'s Session 7.

**Update, 2026-08-23 (session 6): fixed a real security bug — uploaded client documents were
served with no authentication or ownership check at all — and built the report viewer that was
never actually implemented.** Diagnosed first, in the specific order asked for: the file
URL/directory was correct, and Content-Type/Content-Disposition were already fine, but
`app.js` served every uploaded file through a plain `express.static` mount with zero auth, reachable
by anyone with the URL. Closed it — every file now goes through a new permission-checked
`GET /api/reports/:id/file` (same per-role ownership rule `GET /reports` already used: client own
report only, dietitian own client's reports only, admin any). That route also had to explicitly
override helmet's default `Cross-Origin-Resource-Policy: same-origin` header (a distinct mechanism
from both CORS and CSP — checked precisely and confirmed CSP itself was never actually implicated,
since the client page sets none of its own), or the browser would silently block loading the file
at all once client and server are on different production origins. The honest root cause behind
"documents fail to load or preview," though: **no viewer existed on either portal at all** — a
report's filename was inert text, never a link, on both the client's and dietitian's report cards.
Built a real one (new shared `ReportFileViewer.jsx`): authenticated blob fetch, inline PDF/image
preview via a `blob:` object URL with a correct create/revoke lifecycle, a clear message for
unsupported types, a Download original button for every type, and explicit loading/error states —
the error state shows the server's real reason, not a generic one. Also closed an adjacent
path-traversal write in the upload path found while fixing the same file-naming code. Not verified
against a live database/browser this session — no local MySQL reachable, carried over like most
sessions today. Full account in `docs/worklog/2026-08-23.md`'s Session 6.

**Update, 2026-08-23 (session 5): the weekly plan builder can now hold a meal slot that isn't from
the recipe catalog at all.** The Meal type dropdown gained a "Custom" option (mirroring the
existing Custom-category pattern on the recipe form) — picking it swaps the recipe dropzone for a
free-text recipe-name field and reveals a free-text meal-type-name field. `plan_meals.meal_type`
relaxed from a fixed 4-value ENUM to free text (same move already made for `recipes.meal_type`);
new nullable `custom_title` holds the typed recipe name, mutually exclusive with `recipe_id` via a
real DB `CHECK`, not just application-level validation. Switching a slot away from Custom and back
preserves what was typed rather than losing it — the local builder state keeps the custom buffers
separate from the fixed-type ones, only resolving which pair to save at save time. All three places
a diet renders (the client's Meals screen, the Overview next-meal card, and the client profile's
last-15-days table) extend their existing empty-slot fallback chain by one link:
`recipe title → customTitle → "<mealType> — recipe TBD"`. Not verified against a live
database/browser this session — no local MySQL reachable, carried over like most sessions today.
Full account in `docs/worklog/2026-08-23.md`'s Session 5.

**Update, 2026-08-23 (session 4): Add New Dietitian now requires email/phone/address, Edit
Dietitian became a full profile page, and email/phone became editable on Edit Client in both
portals.** New `users.address`/`qualifications`/`account_status` columns (the last an
`active`/`inactive`/`suspended` enum, default `active`, non-breaking). Dietitian rows in Manage
Users now open a dedicated page (`/app/users/dietitians/:id`) with a Details tab (personal info,
credentials, contact, account status) and a Working hours tab — the latter reuses the *existing*
self-service weekly-hours endpoint/component with an optional admin-supplied dietitian id, so
there's no second copy of the availability data the booking engine reads. `suspended` blocks login
both at `POST /auth/login` and on every subsequent request via `authenticate` (so an
already-logged-in session is cut off immediately, not just the next login); `inactive` is a
visible-only flag. Confirmed by reading the JWT/auth code directly (not assumed) that changing a
user's email never invalidates their session, since tokens sign the user's id, never their email —
so editing a client's email (now possible from both the admin dialog and the dietitian's own client
profile, the latter restricted server-side to exactly `{email, phone}` on their own assigned
client) needed no extra session-handling. Also confirmed, by reading the code, that nothing
cascades from `accountStatus` into `calls`/`plans`/`assigned_dietitian_id` — deactivating or
suspending a dietitian can't orphan their appointments by construction — but flagged two real,
deliberately-unsolved gaps: a suspended dietitian's calls still show normally on a client's Calls
tab, and the dietitian-picker endpoint isn't filtered by status, so a client could still pick or
already see one. Full account, including the exact prose answers to both explicit "tell me" asks,
in `docs/worklog/2026-08-23.md`'s Session 4.

**Update, 2026-08-23 (session 3): moved client-account creation from "Follow-up" to "Successfully
Converted / Won"** — a Follow-up call now books directly against the enquiry (new
`calls.enquiry_id`, nullable `calls.client_id`, DB-enforced `CHECK` that exactly one is ever set —
no fake/stringified client id), and only an explicit Convert creates the account, prefilled from
the enquiry, carrying over the enquiry's history (into `client_notes`) and any follow-up calls
(re-pointed in place, same row/id) so the new client isn't a blank slate. The whole conversion runs
in one transaction. Ran the required audit for accounts the old behavior already created against
the live production database (via Railway) — found **one** real account with genuine activity on
it, reported and deliberately **not deleted** pending a decision. Also applied this session's (and
a still-pending prior session's) schema migration to production while there — the application code
itself is not deployed yet. Full account in `docs/worklog/2026-08-23.md`'s Session 3.

**Update, 2026-08-23 (session 2): investigated a reported "client-side call reschedule does
nothing" bug — could not reproduce it, on the source or on the live deployed app.** Read and
diffed the client vs. dietitian reschedule implementations line-for-line, then drove the real
production app in a browser as the seeded client: booked a call, rescheduled it (dialog opened,
picker populated with live-validated slots, save succeeded, card updated immediately), and
confirmed a slot taken by a second call was correctly excluded from the picker (proving
re-validation, not a stale/cached list). Reported the honest diagnosis rather than inventing a fix
for working code. The comparison did surface two real, narrower issues, both fixed: the client's
reschedule dialog was sourcing "whose availability to check" from the client's *current* assigned
dietitian instead of the call's own (fixed — matters after a reassignment); and the shared
`SlotPicker` had a genuine crash-prone edge case (rendering `data.slots` while the availability
query was disabled, i.e. `data` still `undefined`) that would have silently blanked the dialog
instead of showing an error, now fixed with an explicit error state. Full account, including how
the reproduction was verified, in `docs/worklog/2026-08-23.md`'s Session 2.

**Update, 2026-08-23: fixed a real bug where a dietitian's working hours showed up shifted by
roughly their own UTC offset** (e.g. a 9-5 schedule appeared as ~4:00 AM-11:30 AM to a
same-timezone client). Root cause: `dietitian_weekly_hours` stores plain wall-clock strings with no
timezone context, and `checkAvailability` was comparing a candidate slot's *UTC* hour directly
against those raw strings — silently treating dietitian-local input as if it were already UTC (a
missing conversion, not a double one; confirmed via a full trace before any fix — no manual offset
math or bare-time `new Date()` parsing existed anywhere). Fixed with one rule: working hours are
wall-clock in the dietitian's own IANA timezone (new `users.timezone` column, default `'UTC'` so no
existing dietitian is silently relocated), appointments/exceptions stay UTC instants (unchanged),
and the one needed conversion happens via `date-fns-tz` (new dependency — the project had no date
library before), DST-aware, no manual arithmetic. Client-visible slots now also label the viewer's
own timezone. New dietitian-facing "Your timezone" field on the Availability screen. 4 new unit
tests, including a regression test that pins the exact UTC instant the old code got wrong. Not
verified against a live database/browser this session (no local MySQL reachable). Full trace and
account in `docs/worklog/2026-08-23.md`.

**Update, 2026-08-22 (session 7): client and their assigned dietitian can now message each other,
with persistent history, a dietitian conversation list, and an unread indicator — polling only, no
websocket infrastructure.** New `messages` table (conversation identity is the `(client,
dietitian)` pair itself, no separate conversations resource); every route requires role `client`
or `dietitian` — admin is excluded entirely, not given oversight access. Server-side scoping lives
in one function (`message.controller.js#resolveConversation`): a client always means "me and my
current assigned dietitian" (never client-supplied), a dietitian must name a client and can only
ever address one they're currently assigned to (`403` otherwise) — if a client is later
reassigned, the old thread becomes inaccessible to both the old dietitian and the client's own
lookup. New shared `MessageThread.jsx` (chat bubbles, auto-scroll, composer) powers both the
client's standalone Messages screen and the dietitian's list+thread split view
(`DietitianMessagesScreen.jsx` + `ConversationListItem.jsx`), the latter answering the spec's
explicit "dietitians have multiple clients" ask. Wired a real unread-count badge into the Sidebar
nav item and fixed a long-standing placeholder — the Sidebar's "Message us" footer button had
shown `toast('Messaging is coming soon.')` since early in the project; it now actually navigates.
Not yet run against a live database this session — same environment constraint as Sessions 5–6, no
local MySQL reachable — verification is DB-free only (server files `node --check`d, unit suite
unaffected, client build + lint clean). Full account in `docs/worklog/2026-08-22.md`'s Session 7.

**Update, 2026-08-22 (session 6): admin/dietitian now get one tabbed client-profile page —
info/plan, full progress history, last-15-days meal plans, call history with per-call notes, and
general notes — replacing the old quick-view drawer.** New route `/app/clients/:id`
(`ClientProfileScreen.jsx`), reached by clicking a client in the existing Clients list; five tabs
(Overview, Progress, Meal plans, Calls, Notes), each its own lazily-loaded chunk whose data query
doesn't fire until opened (Radix `Tabs` don't mount inactive content by default). Two real gaps had
to be closed in the data model before the page could show anything meaningful: meals had no
`notes` field at all (now `plan_meals.notes`, captured in the plan builder), and rescheduling a
call has always silently overwritten its time with no trace (`calls.original_scheduled_at`/
`rescheduled_at`, stamped server-side on a genuine reschedule, surfaced as a "Rescheduled" badge).
New `client_notes` table for free-standing notes not tied to any call/report, author-or-admin
editable. Per-call notes needed no new API — `PATCH /calls/:id` already allowed editing them any
time; the gap was purely a missing UI, now an inline always-editable field in the call history
card. Not yet run against a live database this session — same as Session 5, no local MySQL was
reachable — verification is DB-free only (server files `node --check`d, unit suite unaffected,
client build + lint clean, confirmed each tab really is a separate JS chunk in the build output).
Full account in `docs/worklog/2026-08-22.md`'s Session 6.

**Update, 2026-08-22 (session 5): Progress now tracks four body measurements alongside weight, with
current-vs-previous deltas, a full append-only history table, and a dashboard summary.** `progress`
gained nullable `waist`/`hip`/`thigh`/`upper_arm` columns (weight stays the only required field).
The entry form (`ProgressEntryDialog.jsx`) gained the four new optional inputs; My Progress
(`ProgressScreen.jsx`) now shows a 5-field measurements grid with change-since-last-entry hints
(distinguishing "no previous record at all" from "this field wasn't recorded last time" — the
spec's empty and single-record states) and a new `ProgressHistoryTable.jsx` listing every entry;
the Client Dashboard's `ProgressSnapshotCard.jsx` gained a compact latest-value/delta chip row for
whichever measurements have been recorded. Not yet run against a live database this session — no
local MySQL was reachable — so verification is DB-free only (schema/model/schema.js checked, client
build clean, existing unit tests unaffected); real end-to-end browser verification is carried over.
Full account in `docs/worklog/2026-08-22.md`'s Session 5.

**Update, 2026-08-22 (session 4): the weekly diet now captures an explicit date range, a real
autosave bug in the plan builder is fixed, and Report reviews never shows every client's reports
mixed together.** Three independent pieces:
1. **Week Start/End Date** — `plans` gained an additive `week_end` column (the existing `week`
   keeps its exact meaning as "start," so every existing lookup/index is untouched). Week End Date
   is auto-computed as start + 6 days and shown read-only in the assignment UI, not independently
   pickable — `DayTabs.jsx`'s fixed 7-tab week rendering has no concept of a variable-length week,
   so an independent end date would have silently broken it. Both dates are immutable after
   creation, matching the existing `week` field's behavior. Existing plans were backfilled.
2. **Meal-time autosave bug, diagnosed before being fixed** (per explicit request): unsequenced
   fire-and-forget autosave PATCHes (full-array replace) could race out of order at the DB, and a
   hydrate effect unconditionally re-seeded local state from any background refetch with no
   dirty/in-flight guard — together, a stale server response could silently overwrite a newer edit
   mid-session. Fixed entirely client-side: saves are now serialized (`mutateAsync` + an in-flight
   guard, queuing a follow-up save with the latest state rather than firing an overlapping request),
   with a proper rollback-with-toast on failure and a hydrate guard that only re-seeds while the
   client/week selection is unchanged and nothing is dirty/in-flight.
3. **Reports client filter** — `DietitianReportsScreen.jsx` was calling its `useReports` hook with
   no argument, defaulting to every one of the dietitian's clients' reports mixed together (the
   backend already fully supported single-client scoping). Added a client `Select` that
   auto-selects the first client on load and a persistent "Showing reports for {name}" header, so
   exactly one client's reports show at a time, never all at once.

All three verified end-to-end: curl against the live server (valid/mismatched/missing `weekEnd`
validation), a direct DB check proving a rapid-fire sequence of meal-time edits persists only the
final value (not an older one) and survives a refresh, and a real browser session switching between
clients on the Reports page. Full account in `docs/worklog/2026-08-22.md`'s Session 4.

**Update, 2026-08-22 (session 3): admin can now define Plans clients enroll in, the enquiry
pipeline keeps real history and can turn a lead into a real client account (with a real scheduled
call for Follow-up), and recipes can carry a custom category.** Four independent pieces:
1. **Program Plans** — a new admin-managed "Plan" (name/description/active), assigned to a client
   at creation/edit alongside a fixed Plan Duration list (1/3/6/12 months). New `/app/plans` admin
   screen; automatically visible to every dietitian (`GET /program-plans`, no per-dietitian
   ownership); shown read-only in `ClientDetailDrawer`'s new "Program" section (kept deliberately
   separate from the existing "Current plan" section, which is the unrelated weekly meal plan).
2. **Enquiry history** — every status change now appends an immutable `enquiry_history` row
   instead of overwriting a single note column; a new detail drawer shows the full timeline.
   "Contacted" requires conversation notes, "Unsuccessful" (the existing `closed` status,
   relabeled) requires a reason — both block the transition until provided.
3. **Enquiry Follow-up / Converted** — "Follow-up" now books a real call through the Phase-3
   availability service (reusing `SlotPicker`) and, the first time either "Follow-up" or
   "Converted" is reached, creates the lead's real client account (temp password, Plan/Duration).
   A real bug was caught and fixed here: if the call-booking step failed after the account was
   already created, the account was orphaned (enquiry never learned its id, permanently blocking
   retries since the email was taken) — fixed by persisting the new account's id immediately,
   before attempting the call.
4. **Recipe custom categories** — `recipes.meal_type` relaxed from a fixed 4-value ENUM to free
   text (confirmed safe: the weekly plan builder never compares a recipe's category to a slot's
   own type). The Create/Edit Recipe form's "Category" select gained a "Custom" option revealing a
   free-text input; the Recipe Library's filter tabs now include whatever custom categories exist,
   alongside the 4 fixed ones.

All four verified end-to-end in a real browser and via curl against a live server (not just
build/lint) — including the orphaned-account bug, reproduced and confirmed fixed via a real
double-request sequence. Full account in `docs/worklog/2026-08-22.md`'s Session 3.

**Update, 2026-08-22 (session 2): the "Repeat Call" recurring-auto-scheduling feature is gone
completely, and booking/rescheduling now show only real available slots.** Removed
`server/src/jobs/callScheduler.js`, the `frequency`/`recurrence_parent_id` columns (dropped from
the DB, not just unused — `server/src/db/migrate.js` gained matching `DROP` statements), and all
UI for it — every call is one-off now. `GET /calls/available-slots` is new: it reuses the same
`checkAvailability` core the booking check already runs, enumerating every open 30-minute slot for
a day so "shown as available" can never drift from "actually bookable." Both the client's and
dietitian's booking dialogs now show a date input + a slot-button grid (in book **and** reschedule
mode) instead of a free-form datetime field, backed by a new shared `SlotPicker.jsx`. Reschedule
itself was already correct (same row updates in place, already re-validated since the availability
work) — the one real gap was cross-session freshness, closed by polling `useCalls()` every 20s
(matching the existing reminder-poll cadence) so a change by one party shows up for the other
without a manual reload. Verified end-to-end in a real browser: booked a slot as the client,
confirmed it disappeared from the grid, rescheduled it, confirmed the old slot reappeared and the
new one was taken, and confirmed the change was visible from the dietitian's own session. Full
account in `docs/worklog/2026-08-22.md`'s Session 2.

**Update, 2026-08-22 (session 1): dietitian calls can no longer be double-booked, and a dietitian can now
define when they're actually available.** `POST /calls`/`PATCH /calls/:id` (previously
unrestricted — any client/dietitian/admin could book any overlapping time) now validate every
booking or reschedule against a recurring weekly-hours template and a generalized
`closed`/`open` exception table (covers a blocked date, a blocked time within a day, a multi-day
holiday/personal period, and extra hours on a normally-closed date, all as the same shape).
Fixed 30-minute call slots; a dietitian/admin can pass `force: true` to bypass the rules for a
genuine exception, a client never can. The concurrent-booking race is closed with a real
`SELECT ... FOR UPDATE` transaction lock, not just an application-level check — this surfaced and
fixed two real bugs along the way (a missing composite index causing over-broad InnoDB locking,
and a genuine deadlock needing a transaction-retry). New self-service screen: the dietitian's
existing "Schedule calls" page gained an "Availability" tab. Also fixed a real, previously-latent
bug in the shared `Tabs` UI primitive (installed early on but never actually used until this
screen) that made it render invisibly. New: `server/tests/` (Node's built-in `node:test`, zero
new dependencies) — unit tests for the conflict logic plus an integration test proving the race
is actually closed. Full account in `docs/worklog/2026-08-22.md`.

**Update, 2026-08-19 (session 3): the production deploy was actually broken — every login on the
live site has failed since the Netlify domain got renamed, and nobody had caught it.** Render's
`CLIENT_ORIGIN` env var still pointed at `nevo-diet-planner.netlify.app` (a 404) while the real live
site is `nevo-dietplanner.netlify.app` (no hyphen) — the API worked fine over `curl`, but the
browser silently dropped every response as a CORS failure, surfacing as "Can't reach the server
right now." Fixed via the Render dashboard (env var + redeploy), verified with a real login and a
real recurring-call booking against production afterward. Also ran Session 1's pending `calls`
table migration against the live Railway MySQL database for the first time (it had only ever been
tested against dev) — Netlify and Render were both already auto-deployed on the right commit, so
the database was the only piece actually behind. Full account, including a near-miss where a
misclick almost deleted a Railway env var, in `docs/worklog/2026-08-19.md`'s Session 3.

**Update, 2026-08-19 (session 1-2): calls can now recur automatically and remind you before they start —
explicitly a testing feature, scoped small on purpose.** Booking a call now has a "Repeat" select
(daily/weekly/every 2 weeks/monthly) and a "Remind me" select (10/30/60/120 minutes before, or
none). A new server-side job (`server/src/jobs/callScheduler.js`, a 60s `setInterval`) rolls a
recurring call forward into its next occurrence — same time-of-day, i.e. the "preferred time" —
once its scheduled time passes, and stops automatically the moment a call in the chain gets
cancelled. Reminders are an in-app Sonner pop-up (`client/src/hooks/useCallReminders.js`, client-
side polling) — no real push notifications and no telephony integration, both flagged in
`docs/API.md`'s known gaps rather than silently assumed. `calls.frequency`/
`reminder_minutes_before` needed a schema change to a database that already had the old `calls`
table, which `schema.sql`'s `CREATE TABLE IF NOT EXISTS` can't backfill — added idempotent
`ALTER TABLE` statements to `migrate.js` instead, verified by running the migration twice. Verified
end-to-end against a real running server + database: created a recurring call, waited a real
scheduler tick, confirmed the next occurrence appeared and the chain stayed self-limiting. **Then
verified in a real browser too** (Claude in Chrome, connected and working for the first time on
this project) — logged in as the seeded client and booked a real `Daily`/10-minute-reminder call
through the actual UI, confirming the "Repeat"/"Remind me" selects and the reminder toast mechanism
all work. That session also surfaced a real Claude-in-Chrome environment quirk worth knowing for
future browser-automation work here: the automation tab reports `document.visibilityState:
"hidden"` even while focused, which silently defeats both raw CDP mouse clicks (worked around with
JS-dispatched `.click()`) and TanStack Query's `refetchInterval` polling (a real, if minor, known
gap for backgrounded tabs — not a bug). Full account in `docs/worklog/2026-08-19.md`'s Session 2.

**Update, 2026-08-17 (session 2): closed both remaining functional gaps and did a real
end-to-end browser pass across all three roles.** The dietitian Overview dashboard was still the
Phase-1 placeholder even though its backend endpoint and client hook already existed — built the
real screen (today's calls, client count, clients list). The admin weekly-plan-builder gap was a
real broken path, not a nicety: `plans.dietitian_id` is `NOT NULL` and admin creating a plan
without an explicit `dietitian` would 500 — added a required Dietitian picker to the builder for
admin only, defaulted from the client's own assignment. Fixed a shared-screen copy bug ("Your
clients" shown to admin, who sees *all* clients). Then actually drove the real installed Chrome
(via `playwright-core`, since the Claude-in-Chrome extension is still never connected in this
environment) through every screen in all three roles plus the public enquiry funnel, and caught one
real bug purely from a screenshot: the full-size progress chart's Y-axis was clipping the leading
digit of every decimal weight label ("70.8kg" rendered as "0.8kg") — a narrow `YAxis width` losing
to SVG clipping at the container edge, invisible from reading the code or from a text-content
assertion. Fixed. Full account, including what was verified and how, in
`docs/worklog/2026-08-17.md`'s Session 2.

**Update, 2026-08-17 (session 1): admin can now create and manage users directly, and clients can
choose their own dietitian.** `/app/users` (admin-only) lists every account with role-tab filtering
and lets admin create a client/dietitian/admin account or edit an existing one's role and
dietitian assignment; the client Overview has a "Your dietitian" card that prompts an unassigned
client to pick one from a live directory, or shows/lets them change their current one. Backend:
`GET /users` now also serves clients (forced to a dietitian-only directory, never other
clients/admins), and every write path that sets `assignedDietitian` validates the target is a real
`role:dietitian` account, not just any user id. Full account in `docs/worklog/2026-08-17.md`.

**Update, 2026-08-16: the app is live in production for the first time.** Client on Netlify
(`nevo-diet-planner.netlify.app`) → server on Render (`nourishly-api.onrender.com`) → MySQL on
Railway, all connected and verified end-to-end: logged in as a seeded client through the actual
browser, confirmed real data renders, and confirmed the session survives a full page reload —
directly verifying the cross-origin `sameSite: 'none'` refresh-cookie behavior that had been
flagged since Phase 8 as never checked against a real deployment (see "Known gaps" below, now
resolved). Also landed earlier the same day: the MySQL migration (written and tested 2026-08-12,
finally committed and pushed), a switch of the client deploy target from Vercel to Netlify, and a
re-check of `docs/API.md` against the live route files (no changes needed). Full account,
including the Railway public-vs-private connection string gotcha, in
`docs/worklog/2026-08-16.md`.

**Update, 2026-08-12: the database is now MySQL, not MongoDB.** User-requested stack change,
confirmed explicitly before starting since CLAUDE.md pins the backend to MongoDB + Mongoose.
`server/src/models/*.js` are now hand-written SQL (`mysql2`, no ORM) over the relational schema in
`server/src/db/schema.sql`. The JSON API contract (`_id`, `createdAt`, `tags`, `feedback`, ...) was
preserved exactly, so **no client file changed** — verified end-to-end with an extensive curl
smoke test (login as all 3 roles, full CRUD across every resource, both insights endpoints) against
a live MySQL-backed server, plus a clean `npm run build` on the client. See
`docs/worklog/2026-08-12.md` for the full account, including two real bugs this surfaced (nested
`meal.recipe` missing `_id`, aggregate counts risking string instead of number) and how they were
fixed. A `migrate-from-mongo.mjs` script exists to port any real pre-migration MongoDB data but has
not yet been run against real data (none existed in this dev environment).

## Status at a glance

All eight planned phases are built: static prototype → scaffolded React/Express app → marketing
enquiry flow → real auth → authenticated portal shell → client portal → dietitian portal → admin
portal → deploy-readiness polish. The app runs locally end-to-end (seed script gives working
logins for all three roles) **and is now actually deployed**: Netlify client
(`nevo-diet-planner.netlify.app`) + Render server (`nourishly-api.onrender.com`) + Railway MySQL,
verified end-to-end as of 2026-08-16.

**Update, 2026-08-11: the app has now actually been watched running in a real browser**, for the
first time in the project's history — every prior session's worklog flagged this as the top
unverified risk. The Claude-in-Chrome automation *extension* is still never connected, but a
separate path worked: `playwright-core` driving the system's actual installed Chrome. This
surfaced two real bugs within the first twenty minutes that eight phases of build/lint/curl
verification never caught — see `docs/worklog/2026-08-11.md` for the full account:
- The client Overview screen's compact weight-trend chart rendered a real 6-week, 4.2kg decline
  as a visually flat line (a recharts Y-axis domain that was only applied to the full-size
  variant). Fixed.
- The dietitian's weekly plan builder showed a completely empty schedule for a client who had a
  real, seeded, published plan — the exact same UTC-vs-local-time `startOfWeek()` bug Phase 8
  found and fixed in `insights.controller.js`, except it turned out to exist in **two more
  places** (`client/src/lib/planBuilder.js`, `server/src/seed.js`) that fix didn't think to check
  for. Fixed both, matching the established UTC-safe pattern.
- The plan builder's `@dnd-kit` drag-and-drop was directly exercised with real, scripted mouse
  events (not just static rendering) and confirmed working end-to-end.

Both drag-and-drop surfaces, all three portals, and the full auth flow have now been visually
confirmed to render correctly and match the intended design. What's *not* yet done: a keyboard-
only pass of either drag-and-drop surface, and an independent (not inferred-by-similarity)
confirmation of the enquiry kanban's drag specifically — see that day's worklog for why.

## What's built

**Auth** — register/login/refresh/logout/me, JWT access token in memory + `httpOnly` refresh
cookie, role-aware redirects, "remember where you were going," a seed script
(`server/npm run seed`) with known credentials for all three roles plus demo data.

**Portal shell** — `/app/*` routes individually role-guarded (`RoleRoute`, sourced from one nav
config so the sidebar and the route guards can't drift apart), responsive sidebar + mobile drawer,
profile dropdown, 404 and Unauthorized pages.

**Client portal** (role: client) — Overview (today's meals, next call, progress snapshot),
This week's meals (day tabs, mark-eaten, request-swap), My progress (recharts weight trend,
milestones, log-a-new-entry), Calls (book/reschedule via a real available-slots picker, cancel,
in-app reminders — reminders are testing-stage, added 2026-08-19; slot picker and same-session
cross-visibility added 2026-08-22, replacing the removed recurring-call feature), Messages (direct
chat with the assigned dietitian, 15s polling, unread nav badge — added 2026-08-22), Reports
(upload + read the dietitian's feedback thread; a report's filename opens a real inline PDF/image
viewer with a Download original fallback — added 2026-08-23).

**Dietitian portal** — Dashboard (today's calls, client count, recently-logged-progress count,
today's calls list, clients list — replaced the placeholder 2026-08-17), Recipe library
(search/filter/CRUD, category filter tabs now include any custom categories in use alongside the
4 fixed ones — added 2026-08-22), Weekly plan builder (`@dnd-kit` drag-and-drop from a recipe rail onto meal
slots, autosave — now serialized/guarded against the race that could clobber a fast edit,
see Known bugs fixed below — publish, an explicit Week Start/End Date with the end date
auto-computed and locked at start+6 days — added 2026-08-22; every dropzone is *also* an
independent accessible `Select`, not drag-only; admin sees an additional required Dietitian
picker, a dietitian caller doesn't; a meal slot's type can now be set to "Custom" for a manually
typed meal-type name and recipe name, with no catalog selection required — added 2026-08-23),
Clients list opening a full tabbed client profile page (`/app/clients/:id` — info/plan, full
progress history + chart, last-15-days meal plans, call history with editable per-call notes,
general notes; each tab lazily loaded — replaced the old quick-view drawer 2026-08-22; the
Overview tab's client info now has an Edit button for email/phone, restricted server-side to
those two fields on the dietitian's own client — added 2026-08-23), Schedule
calls (now with an Availability tab —
weekly hours, blocked dates/times/holidays, extra hours on a specific date — added 2026-08-22),
Messages (a conversation list — one row per client, unread badges, most-recently-active first —
next to a thread panel; added 2026-08-22), Report reviews (a client `Select` narrows to exactly
one client's reports at a time, never all mixed together — added 2026-08-22; reply to a client's
feedback thread; a report's filename opens a real inline PDF/image viewer, permission-checked
server-side, with a Download original fallback for every type — added 2026-08-23).

**Admin portal** — Business overview KPIs, Enquiry pipeline as a kanban with real drag-and-drop
*and* per-card dropdown status transitions (same accessible dual-path pattern as the plan
builder) — plus a detail drawer showing each enquiry's full append-only history, required notes on
Contacted/Unsuccessful, Follow-up booking a real call directly against the enquiry (no account —
added 2026-08-22, call now enquiry-linked not client-linked as of 2026-08-23), and only
"Successfully Converted / Won" creating the real client account, prefilled from the enquiry and
carrying over its history/calls (added 2026-08-23, not yet deployed), Growth insights (real 8-week enquiry volume,
pipeline-stage breakdown, and dietitian workload charts — no more empty placeholders), **Manage
users** (create client/dietitian/admin accounts, edit an existing user's role, dietitian
assignment, and Program Plan/duration — added 2026-08-17, plan fields added 2026-08-22; adding a
dietitian now requires email/phone/address, and editing one opens a full profile page — personal
details, credentials, contact info, working hours through the same availability model the booking
engine reads, and account status active/inactive/suspended — added 2026-08-23, not yet deployed),
**Plans**
(create/edit/activate-deactivate the named service plans clients can be enrolled in, automatically
visible to every dietitian — added 2026-08-22).

**Client ↔ dietitian assignment** — a client can browse the dietitian directory and pick (or
change) who they work with from their Overview screen; admin can also assign/reassign a client to
a dietitian from Manage users. Added 2026-08-17.

**Deploy & polish** — `server/Dockerfile`, `client/netlify.toml` (SPA redirects), root `README.md`
with Netlify/Render/Railway steps and a production `.env` checklist, route-level code splitting
(`React.lazy`, cut the main JS bundle from one ~1.27MB chunk to a 697KB vendor chunk + ~24 small
per-route chunks), font-loading optimization (moved off a render-blocking CSS `@import` to
preconnected `<link>` tags), real meta tags + a brand favicon (replacing a leftover generic
scaffold placeholder), a `ServerErrorPage` wired as the router's `errorElement`, and a global toast
for background query failures that would otherwise fail silently.

**Real bugs found and fixed along the way** (not asked for, found while building — see the
worklog for each day's full reasoning):
- **2026-08-23 (session 6)**: `upload.js`'s multer filename callback used the client-supplied
  original filename unsanitized — an upload with `../` in its name could have written outside the
  uploads directory. Found while fixing the (separately reported) unauthenticated file-serving bug,
  since it's the exact same file-naming code path; fixed alongside it with `path.basename`.
- **2026-08-22 (session 4)**: the weekly plan builder's meal-time autosave could silently overwrite
  a user's newer edit with a stale one — unsequenced fire-and-forget PATCHes could race out of
  order at the DB, and a hydrate effect unconditionally re-seeded local state from any background
  refetch with no dirty/in-flight guard. Diagnosed before fixing (per explicit request), fixed by
  serializing saves client-side and gating the hydrate effect.
- A refresh-interceptor deadlock that would have hung `isLoading` forever for any anonymous
  visitor (Session 4).
- Multiple dietitian-authorization gaps: cross-client data leaks on `Progress`/`Report` listing,
  and a complete lack of ownership checks on `Plan` create/update/delete (Sessions 6–7).
- **Phase 8**: a production-blocking bug where the refresh cookie's `sameSite: 'strict'` would
  have silently broken login persistence entirely once client and server were deployed to
  different domains — caught by reasoning through the actual deploy topology this phase asked
  for, not by any test. Also a sitewide color-contrast bug: `text-muted` had been used in ~40
  files across every phase since Session 4, believed to give readable secondary text, but a CSS
  token-name collision (`--color-muted` redefined twice — once as a raw brand hex, once by the
  shadcn semantic layer — with the second silently winning) made it resolve to a near-invisible
  light sage instead. Caught only by running a real Lighthouse accessibility audit, not by
  reading the code. Fixed at the CSS root and across all 42 affected files.
- **2026-08-11**: the client Overview's compact weight chart visually flattened a real trend
  (missing Y-axis domain on the compact variant only), and the same `startOfWeek()`
  UTC-vs-local-time bug fixed once in Phase 8 turned out to exist in two more places
  (`planBuilder.js`, `seed.js`), breaking the plan builder's schedule entirely for any client with
  a seeded plan. Both caught only by actually opening the app in a real browser — see above.
- **2026-08-17**: a *different* bug in the same `WeightTrendChart.jsx` component the 2026-08-11 fix
  touched — the full-size Progress screen's Y-axis was clipping the leading digit of every decimal
  tick label ("70.8kg" rendered as "0.8kg") because `width={36}` wasn't enough room for a 6-char
  label combined with that variant's zero left margin, so recharts positioned the text past the
  container's clipped edge. Only visible with real decimal weight data in a real screenshot — a
  text-content assertion wouldn't have caught it, since the text was technically present in the
  DOM, just visually truncated. Fixed by widening to `48`.

## Known gaps (flagged, not silently decided)

- The available-slots date picker (`GET /calls/available-slots?date=`) submits the *viewer's*
  browser-local calendar date, but the server now resolves it against the *dietitian's* local
  calendar day (as part of the 2026-08-23 timezone fix — see that day's worklog). For a client
  several hours removed from their dietitian, the exact day boundary can differ by one calendar
  day between the two; the time-of-day conversion and labelling are correct, but a full
  "which day bucket" scheduling UX (as Calendly-style tools handle) wasn't built.
- A keyboard-only pass (Tab/Space/Arrow keys, no mouse) of both drag-and-drop surfaces, and an
  independent confirmation of the enquiry kanban's drag specifically (only inferred working from
  the plan builder's identical underlying mechanism) — see `docs/worklog/2026-08-11.md`.
- The marketing site itself is still the Phase 1 scaffold placeholder, not the ported
  `legacy/index.html` — Phase 2 was never actually done as a dedicated phase. This is the one
  remaining gap across the whole app as of 2026-08-17; everything else in this list below it is
  either resolved, a deliberate call, or infra/ops rather than app functionality. The enquiry modal
  the homepage launches *does* work end-to-end (verified 2026-08-17) — it's specifically the visual
  page around it that's unported.
- No production-safe first-admin bootstrap flow — `npm run seed` is the dev-only stand-in (the
  admin "Manage users" screen lets an existing admin create more admins, but doesn't help bootstrap
  the very first one).
- A keyboard-only (Tab/Space, no mouse) pass of the admin Manage-users dialogs and the client
  dietitian-picker dialog specifically hasn't been done — they use the same Radix `Dialog`/`Select`
  primitives already keyboard-accessible elsewhere in the app, but that hasn't been independently
  re-confirmed for these three. See `docs/worklog/2026-08-17.md` session 2.
- Report file storage is local disk (`server/uploads/`), which is ephemeral on most PaaS hosts —
  fine for a demo, needs S3/R2 (or a persistent disk) for real use.
- No repo-wide automated test suite — as of 2026-08-22, `server/tests/` (`node:test`) exists but
  covers only the availability service, not the rest of the app.
- Two more Lighthouse color-contrast findings remain, deliberately not fixed: white text on the
  `coral` primary button (2.82:1) and `sage-deep` eyebrow labels (3.13:1) both fall under WCAG
  AA's 4.5:1 threshold — but both are CLAUDE.md §4's *exact specified brand colors* against the
  *exact specified* cream background, not implementation bugs. Fixing them would mean deviating
  from "preserve the visual design... this is a port, not a redesign," which isn't a call to make
  silently. Flagging for whoever owns the brand palette to decide.
- Netlify deploy previews (a different URL per PR/branch) will fail CORS against a
  single-origin `CLIENT_ORIGIN` production API — noted in the README, not solved.
- Two abandoned duplicate Render services (`nourishly-api-32tp`, `nourishly-api-8a63`) exist from
  earlier failed Blueprint-apply attempts, both in a failed state — safe to delete, left for the
  user to remove.
- Render's Shell and persistent disks both require a paid plan; the project is staying on
  `plan: free`, so one-off scripts (`db:migrate`, `seed`) against production have to be run from a
  local machine with `MYSQL_URL` pointed at the production database, not from Render itself.
- Operational note, not app code: on this Windows dev machine, stopping a background `npm run
  dev`/`vite preview` task through the harness's task-stop mechanism did not reliably kill the
  underlying OS process across this project's sessions — by Phase 8 this had accumulated over 30
  orphaned `node.exe` processes competing for CPU. Cleaned up during Phase 8; worth checking for
  again in any future session on this machine (`Get-Process node`).

## Known gaps (flagged, not silently decided)

- Call reminders (2026-08-19) are still testing-stage: client-side polling + an in-app toast only,
  not a push notification or real phone call. (The recurring "Repeat call" auto-scheduling half of
  that work — the `setInterval` scheduler — was removed completely on 2026-08-22, both booking
  dialogs' reminder pickers verified in a real browser that same session.)

## Session index

One line per work session, newest first. Links to `docs/worklog/YYYY-MM-DD.md`.

- [2026-08-23](worklog/2026-08-23.md) — **Session 6**: fixed a real security bug — uploaded report
  files were served through a completely unauthenticated `express.static` mount, reachable by
  anyone with the URL — by replacing it with a permission-checked `GET /api/reports/:id/file`
  (same per-role ownership as `GET /reports`). Also fixed a confirmed `Cross-Origin-Resource-Policy`
  block that would break loading the file in production (client/server on different origins), and
  built the report viewer that turned out to never actually exist on either portal (a filename was
  inert text, not a link): inline PDF/image preview via an authenticated blob fetch and a `blob:`
  object URL, a clear message for unsupported types, a Download original button for every type, and
  loading/error states that show the server's real reason. Closed an adjacent path-traversal write
  in the upload path found along the way. **Session 5**: added a "Custom" meal type to the weekly
  plan builder — picking it reveals free-text meal-type-name and recipe-name fields instead of the
  catalog dropzone, so a meal slot no longer has to be one of the 4 fixed types or a catalog
  recipe. `plan_meals.meal_type` relaxed to free text (mirroring `recipes.meal_type`'s own earlier
  change), new `custom_title` column mutually exclusive with `recipe_id` via a DB `CHECK`.
  Switching a slot away from Custom and back preserves what was typed. Extended the existing
  empty-slot fallback (`"<type> — recipe TBD"`) to include a custom title across all three places a
  diet renders. **Session 4**: expanded Add New Dietitian (now requires
  email/phone/address, server-validated + email uniqueness), replaced Edit Dietitian's small dialog
  with a full profile page (personal details, credentials, contact, account status
  active/inactive/suspended, and working hours reusing the existing self-service endpoint/component
  with an optional admin dietitian id — not a second copy), and added editable email/phone to Edit
  Client in both the admin and dietitian portals. `suspended` blocks login immediately, even for an
  already-logged-in session; confirmed by reading the JWT code that an email change never
  invalidates a session (tokens sign the user id, not the email). Confirmed nothing cascades from
  account status into calls/plans/assignment, so deactivating a dietitian can't orphan their
  appointments — but flagged that a suspended dietitian's calls still show normally to their client
  and the dietitian-picker isn't status-filtered. **Session 3**: moved client-account creation from
  Follow-up to Converted/Won (spec item 1) — Follow-up now books a call directly against the
  enquiry (new nullable `calls.client_id` + `calls.enquiry_id` with a DB `CHECK` constraint), and
  only Converted creates the account, transactionally carrying over history/notes/calls. Audited
  production for pre-existing over-eager accounts: found and reported one (not deleted — has real
  activity). Migration applied to production; application code not yet deployed. **Session 2**:
  investigated spec item 5 (reported
  client-side reschedule failure) — not reproducible on the source or live in production after a
  real browser test; reported the honest diagnosis instead of fabricating a fix, but fixed two real
  issues the client-vs-dietitian comparison surfaced (wrong dietitian source for the reschedule
  picker; a crash-prone `SlotPicker` edge case when the availability query is disabled). **Session
  1**: fixed the dietitian-availability timezone bug (spec `2026-round2-fixes.md` item 7): working
  hours are now wall-clock in the dietitian's own IANA timezone (new `users.timezone`, default
  `'UTC'`, non-breaking), converted exactly once via `date-fns-tz` (new dependency) instead of being
  silently compared as if already UTC. Traced the root cause end-to-end before fixing, per the
  explicit ask. 4 new unit tests.
- [2026-08-22](worklog/2026-08-22.md) — **Session 7**: built client ↔ assigned dietitian messaging
  — persistent history, server-side conversation scoping enforced in one place, a dietitian
  conversation list with unread badges, sensible ordering, 15s polling (no websocket
  infrastructure). Admin excluded entirely. Not verified against a live database/browser this
  session (no local MySQL reachable) — carried over. **Session 6**: built the client profile "centrepiece" page
  (`/app/clients/:id`) for admin/dietitian — tabbed Overview/Progress/Meal plans/Calls/Notes, each
  lazily loaded. Added meal notes and call reschedule-tracking to the data model (both were real
  gaps), a new general `client_notes` table, and wired existing per-call notes editing into the new
  Calls tab. Replaced and deleted the old `ClientDetailDrawer.jsx`. Not verified against a live
  database/browser this session (no local MySQL reachable) — carried over. **Session 5**: added
  body-measurement Progress fields
  (waist/hip/thigh/upper arm alongside weight) — entry form, a current-vs-previous measurements
  grid with empty/single-record-aware hints, a full append-only history table, and a Client
  Dashboard summary chip row. Not verified against a live database/browser this session (no local
  MySQL reachable) — carried over. **Session 4**: added an explicit Week Start/End Date to the
  weekly diet assignment flow (end date auto-computed and locked at start+6 days), diagnosed and
  fixed a real meal-time autosave race/clobber bug in the plan builder (serialized saves, a
  dirty/in-flight-guarded hydrate effect, rollback-with-toast on failure), and added a client filter
  to the dietitian Reports page so exactly one client's reports show at a time. **Session 3**: added admin-managed Program Plans (new
  entity, kept distinct from the existing weekly meal Plan), enquiry pipeline history (append-only,
  nothing overwritten) with required notes on Contacted/Unsuccessful, Follow-up/Converted creating
  a real client account and (for Follow-up) a real scheduled call via the Phase-3 availability
  service, and recipe custom categories (relaxed `meal_type` to free text, confirmed the plan
  builder never depended on its fixed values). Caught and fixed a real orphaned-account bug where a
  failed call-booking could leave a created account permanently unreachable. **Session 2**: removed
  the "Repeat Call" recurring feature completely (job, schema columns dropped via new `migrate.js`
  `DROP` statements, all UI), added a
  `GET /calls/available-slots` endpoint reusing the availability service's conflict logic, and
  replaced both booking dialogs' free-form date/time input with a real slot-picker grid (book
  **and** reschedule mode). Closed a cross-session freshness gap by polling the main calls list
  every 20s. Verified end-to-end in a real browser: book → slot disappears → reschedule → old slot
  frees, new slot blocks → visible from the dietitian's own session. **Session 1**: built a
  dietitian availability service (weekly hours, date/time/holiday blocks, double-booking prevention
  with a real concurrency-safe lock) and wired it into call booking/rescheduling; added a
  self-service Availability tab and the repo's first automated test suite (`server/tests/`,
  `node:test`). Found and fixed two real MySQL locking bugs (missing composite index, a genuine
  deadlock needing a retry) and a latent Tabs-primitive rendering bug, verified in a real browser.
- [2026-08-19](worklog/2026-08-19.md) — **Session 3**: found and fixed a real production bug
  (Render's `CLIENT_ORIGIN` pointed at a 404'd domain, silently breaking every live-site login via
  CORS since the Netlify rename), ran the pending `calls` migration against production Railway
  MySQL for the first time, and verified login + a recurring-call booking against the real deployed
  app. **Sessions 1-2**: added recurring call auto-scheduling (rolls a call forward
  to its next occurrence at the same time-of-day once its time passes, stops on cancel) and in-app
  pop-up reminders (Sonner toast, client-side polling), both explicitly scoped as a testing feature
  per the user's request. Schema change to `calls` needed idempotent `ALTER TABLE`s in `migrate.js`
  since `schema.sql` alone can't backfill an existing table. Verified end-to-end against a real
  running server/database (not just build/lint) — created a recurring call, waited a real 60s
  scheduler tick, confirmed correct rollover and self-limiting-on-cancel behavior.
- [2026-08-17](worklog/2026-08-17.md) — **Session 2**: built the real dietitian dashboard
  (replacing the placeholder), added the required admin dietitian-picker to the plan builder
  (closing a real 500-on-create bug), fixed an admin/dietitian shared-screen copy bug, then clicked
  through all three roles plus the public enquiry funnel in a real browser (`playwright-core` +
  system Chrome) and fixed a real Y-axis label-clipping bug in the progress chart found via
  screenshot. **Session 1**: admin can create/manage users (client, dietitian, admin accounts) from
  a new `/app/users` screen, and clients can browse dietitians and pick/change who they work with
  from Overview; backend `assignedDietitian` writes validate the target is a real dietitian.
- [2026-08-16](worklog/2026-08-16.md) — Committed and pushed the MySQL migration that had sat
  uncommitted since 2026-08-12; fixed a local `node --watch` restart loop that was causing login
  connection resets; prepped `render.yaml` for deploy (added then reverted a persistent disk for
  uploads, staying on the free plan); re-verified `docs/API.md` needed no changes; switched the
  client deploy target from Vercel to Netlify (user-requested) — `vercel.json` → `netlify.toml`,
  README/ARCHITECTURE updated. Then, once the user had connected Netlify, Render, and Railway
  themselves: got the Claude in Chrome extension connected for the first time on this project,
  fixed a stale `MONGO_URI`→`MYSQL_URL` env var and a Railway private-vs-public connection-string
  mixup, redeployed the server, ran `db:migrate`/`seed` against production from a local machine
  (Render's Shell needs a paid plan), and verified the whole chain live in a real browser —
  including that the session survives a page reload, resolving the cross-origin cookie risk
  flagged since Phase 8.
- [2026-08-12](worklog/2026-08-12.md) — Migrated the database from MongoDB/Mongoose to MySQL
  (`mysql2`, hand-written SQL, no ORM), user-requested. Preserved the JSON API contract exactly so
  no client file changed; verified with an extensive curl smoke test against a live MySQL-backed
  server. Fixed two real bugs found along the way (nested recipe missing `_id`, aggregate counts
  risking string instead of number).
- [2026-08-11](worklog/2026-08-11.md) — First real in-browser verification of the whole project
  (`playwright-core` driving the system's installed Chrome). Found and fixed two real bugs (a
  flattened chart, a plan-builder-breaking timezone bug in two more places than Phase 8 caught),
  and directly confirmed the plan builder's drag-and-drop works with real mouse events.
- [2026-08-29](worklog/2026-08-29.md) - Google Meet links on scheduled calls. Per-dietitian
  OAuth (works with ordinary gmail accounts; a service account would have needed Workspace
  domain-wide delegation), built on global fetch with no new dependency. One integration point
  covers ad-hoc, recurring and follow-up bookings because they already funnel through
  `callService#bookCall`; reschedule moves the event, cancel deletes it and clears the link.
  The link rides the .ics invite and the call emails. Entirely inert until GOOGLE_CLIENT_ID /
  GOOGLE_CLIENT_SECRET are set - and not yet exercised against real Google.
- [2026-08-28](worklog/2026-08-28.md) - Session 8: closed the bare `/login` bypass left by
  Session 7. Every user belongs to exactly one company (0 rows have a NULL company_id), so a
  login naming no company skipped the slug check entirely. `/login` now refuses and hands back
  the caller's own `/{slug}/login` for the page to offer as a link - post-password only, so a
  wrong password still returns a plain 401. Probe 52 -> 66 checks, all passing.
- [2026-08-28](worklog/2026-08-28.md) - Session 7: strict multi-tenant company isolation.
  Login resolves the URL slug to a company_id server-side and refuses a cross-tenant sign-in
  before issuing any token; company status is gated; URL manipulation returns 403 instead of
  silently rewriting. New two-tenant fixture (`seed:tenants`) and a 52-check cross-tenant HTTP
  probe (`probe:tenants`), 52/52. Also unblocked the long-hanging multi-tenancy integration
  test - it created users before their companies, so an FK failure in before() left pool.end()
  unreached and the run hung.
- [2026-08-28](worklog/2026-08-28.md) - Session 5: ZenX admin portal swallowed provisioning
  errors - both `provisionCustomer` call sites had `try/finally` with no `catch`, so a 409
  surfaced only as an unhandled AxiosError in the console while the form sat idle. Service now
  unwraps the server message into a `ProvisioningError`; both modals render it.
- [2026-08-28](worklog/2026-08-28.md) - Session 4: fixed intermittent
  `ERR_CONNECTION_RESET` on the login POST in both apps - Node drops an idle keep-alive socket
  after 5s, Chrome holds pooled sockets longer and will not silently retry a POST onto a dead
  one (it does retry GETs, hiding this from the 8s polling). `keepAliveTimeout` raised to 65s
  and `headersTimeout` to 66s on both servers.
- [2026-08-28](worklog/2026-08-28.md) - Session 3: fixed the blank page a ZenX-provisioned
  customer hit right after SSO - `ProtectedRoute` redirects to `/change-password`, but that
  page was only routed at `/:companySlug/change-password`, so the bare path matched the
  parent `/:companySlug` branch with no leaf and rendered an empty `<Outlet/>`. Moved it to a
  top-level route beside `/login`; added an index redirect under `/:companySlug` for the same
  trap on a bare company URL.
- [2026-08-28](worklog/2026-08-28.md) - Session 2: company website carried end-to-end from ZenX
  (form -> provisioning -> handoff claim -> mirror), plus company name/URL/website finally *shown*
  in the portal - sidebar branding, tenant-branded login pages, and a read-only "Your organisation"
  screen. New `GET /api/company/me` + public `/api/company/public/:slug`. `companies` table now
  created by `migrate.js` instead of out-of-band.
- [2026-08-10](worklog/2026-08-10.md) — Phases 1 (verification) through 8, all in one day across
  eight sessions: scaffold verification → enquiry flow → auth → portal shell → client portal →
  dietitian portal → admin portal → deploy & polish. Full detail, including every decision,
  problem hit, and bug found, is in that file's eight `## Session N` entries.
- [2026-08-09](worklog/2026-08-09.md) — Phase 1: repo init, legacy files moved to `legacy/`, full
  API + folder-structure plan approved, `client/` and `server/` scaffolded and building.
