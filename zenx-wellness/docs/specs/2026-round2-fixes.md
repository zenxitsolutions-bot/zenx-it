# 2026 round 2 fixes

> Recreated from the spec text supplied in chat on 2026-08-23 (the file did not previously exist
> in the repo — the user referenced it by path before pasting each item in full, once per
> conversation turn). Items 1, 2, 3, 4, 5, 6, and 7 are known; other items in this round may exist
> but weren't shared here.

## 1. CHANGE — move client-account creation from Follow-up to Converted/Won

Right now moving an enquiry from Contacted to Follow-up auto-creates a client account. That's too
early.

New behaviour:
- Follow-up calls can be scheduled and booked directly against an ENQUIRY, with no client account.
  The booking should hold enquiry details (name, contact) and reference the enquiry, not a
  clientId.
- Add a "Successfully Converted / Won" outcome to the enquiry pipeline alongside Contacted,
  Follow-up and Unsuccessful.
- Only when an enquiry is marked Converted/Won does the create-client-account flow trigger,
  prefilled from the enquiry data, including plan and plan duration selection.
- On conversion, carry over the enquiry history, notes, and any scheduled follow-up calls so the
  new client's call history isn't empty.

Implementation notes:
- The appointment/call entity needs to support either a clientId or an enquiryId. Handle this
  cleanly — don't stringify a fake client id.
- Follow-up bookings still go through the shared availability service; same rules apply.
- Check for and clean up any client accounts already created by the old auto-create behaviour.
  Report what you find before deleting anything.

**Implementation**: see `docs/worklog/2026-08-23.md` Session 3 for the full account — schema
(`calls.client_id` now nullable, new `calls.enquiry_id` with an XOR `CHECK` constraint),
`enquiry.controller.js`'s rewritten `updateEnquiry` (Follow-up books an enquiry-linked call only;
Converted is the sole account-creation trigger and, in one transaction, re-points any
enquiry-linked calls onto the new client and copies the enquiry's history into client notes), and
the production audit (`server/src/db/auditConvertedAccounts.js`) — one pre-existing account found,
reported, **not deleted** pending a decision (it has real activity on it).

## 2. Dietitian admin forms — Add New Dietitian is missing fields, Edit Dietitian allows too little

**Add New Dietitian form** — currently missing essential fields. Add and require: Email, Phone
Number, Address. Validate format server-side, and enforce email uniqueness.

**Edit Dietitian page** — currently allows too little. Expand to full editing of: personal
details, credentials/qualifications, contact information, working hours, and account status
(active/inactive/suspended). Working hours editing here must write to the same availability model
the booking engine reads — not a second copy.

For both: real validation on both sides, clear error messages on the field, and a success
confirmation. Deactivating a dietitian should not silently orphan their upcoming appointments —
report what currently happens and flag it if it's a problem.

**Implementation**: see `docs/worklog/2026-08-23.md` Session 4 for the full account — new
`users.address`/`qualifications`/`account_status` columns, `createUserSchema`'s
dietitian-conditional required fields, a new admin-only Edit Dietitian page
(`DietitianProfileScreen.jsx`) whose Working hours tab reuses the existing self-service
`GET`/`PUT /availability/weekly-hours` endpoint and `WeeklyHoursForm.jsx` component with an
optional admin-supplied dietitian id (no second copy of the availability model), and `suspended`
enforced at both login and per-request via `authenticate` middleware. Deactivation-orphaning is
answered explicitly in that session's write-up: nothing cascades from account status into
calls/plans/assignment, so appointments can't be silently orphaned, but a suspended dietitian's
calls still show normally to their client and the dietitian-picker isn't status-filtered —
flagged, not silently fixed.

## 3. Edit Client (both admin and dietitian portals) — add editable Email Address and Phone Number

If email is the login identifier, changing it must keep the account working; handle that
explicitly and explain how it was handled. Real validation on both sides, clear error messages on
the field, and a success confirmation.

**Implementation**: see `docs/worklog/2026-08-23.md` Session 4 for the full account — editable
email/phone added to Edit Client in both portals (`UserEditDialog.jsx` admin-side, a new
`ClientContactEditDialog.jsx` dietitian-side, the latter restricted server-side to exactly
`{email, phone}` on the caller's own assigned client). Email-as-login-identifier is answered
explicitly in that session's write-up: both JWTs sign only the user's id, never their email, and
every request is authenticated by that id, so changing `users.email` never invalidates an existing
session — only the credential needed at the *next* login changes. Email uniqueness is enforced on
every write (`409`, shown as a field-level error).

## 4. Weekly Diet planner — custom meal types and custom (non-catalog) recipes

In the Weekly Diet planner:
- Add "Custom" to the meal type dropdown alongside Breakfast, Lunch, Snack, Dinner.
- When Custom is selected, the meal slot accepts a user-entered meal type name.
- The "Drop a recipe here" selector becomes an editable text field for a manually typed recipe
  name plus notes — no catalog selection required.

Requirements:
- Custom entries save with the weekly diet and render correctly everywhere the diet is displayed:
  the planner, the client's view, and the last-15-days meal plan history on the client profile.
- A meal slot's food reference must support either a recipeId or free text. Keep this clean in
  the data model.
- Switching a slot from Custom back to a fixed type shouldn't silently lose data — warn or
  preserve.

**Implementation**: see `docs/worklog/2026-08-23.md` Session 5 for the full account —
`plan_meals.meal_type` relaxed from a fixed 4-value ENUM to free text (same convention already
used for `recipes.meal_type`), a new nullable `plan_meals.custom_title` for a manually typed
recipe name, and a DB-level `CHECK` that `recipe_id`/`custom_title` are never both set at once.
The builder's Meal type select gained a 'Custom' option (client-only sentinel, mirroring
`RecipeFormDialog`'s existing Custom-category pattern) that swaps the recipe dropzone for a
free-text input and reveals a free-text meal-type-name input; both buffers are preserved in local
component state even while showing a fixed type, so toggling back to Custom restores what was
typed rather than losing it. All three display surfaces (planner read side, the client's Meals
screen + Overview's next-meal card, and the client profile's last-15-days table) fall back
`recipe.title → customTitle → "<mealType> — recipe TBD"`, the same fallback chain that already
existed for an unassigned catalog slot, just extended by one link.

## 5. BUG — client-side call reschedule appears broken

In the client portal's Calls section, clicking Reschedule on a confirmed call does nothing or
fails silently. The same action works on the dietitian side.

Diagnose first and report the cause. Compare the client and dietitian implementations directly —
likely candidates: the click handler isn't bound, the modal never opens, the client role is
rejected by the reschedule endpoint, a required field the client UI doesn't send, or an error
that's being swallowed instead of surfaced.

Then make client-side rescheduling fully work:
- Opens a slot picker populated by the shared availability service (post-Phase-1 timezone fix).
- Saves the new date/time, frees the old slot, blocks the new one, updates appointment status.
- Immediately visible to both client and dietitian.
- Re-validates availability at confirmation so two people can't take the same slot.
- Surfaces errors to the user instead of failing silently — no more dead button.

While you're here: audit for other swallowed errors in the client calls section and make
failures visible.

**Diagnosis and fix**: see `docs/worklog/2026-08-23.md` Session 2 for the full account — reschedule
was found already working end-to-end on the live deployed app (verified in a real browser against
production), most likely fixed as a side effect of the 2026-08-22 slot-picker rewrite that predates
this spec being written. One real latent discrepancy was found by directly comparing the client and
dietitian implementations and fixed anyway, plus a crash-prone swallowed-error edge case in the
shared `SlotPicker`.

## 6. BUG — uploaded client documents fail to load or preview in Report Review

Uploaded client documents, medical reports, and attachments fail to load or preview in the
dietitian portal's Report Review section.

Diagnose first and report the cause. Check in this order:
- Is the file URL correct and reachable? Are uploads actually landing where the reader looks?
- Auth: is the file request missing the auth header/cookie, or is a signed URL expiring?
- CORS or Content-Security-Policy blocking the iframe/embed.
- Content-Type being served as application/octet-stream instead of application/pdf or image/*.
- Content-Disposition: attachment forcing download instead of inline.
- Blob/objectURL handling in the frontend, and whether the URL is revoked too early.

Then fix it:
- PDFs and images preview inline in the built-in viewer.
- Unsupported types show a clear message rather than a blank frame.
- Always offer a Download original fallback button, for every type.
- Loading state while fetching; explicit error state with the reason if it fails.
- File access must still be permission-checked server-side — a dietitian can only open documents
  belonging to their own clients. Verify this; if the file route is unauthenticated, fix that too.

**Diagnosis and fix**: see `docs/worklog/2026-08-23.md` Session 6 for the full account. The real
cause wasn't any single item on the checklist above in isolation — it was that **no viewer existed
at all** on either portal (a report's filename was shown as plain text, never a link, on both the
client's and dietitian's report cards) sitting on top of two real, confirmed bugs that would have
broken any viewer built naively against the existing file path: (1) uploaded files were served by a
completely **unauthenticated** `express.static` mount at `/uploads` — reachable by anyone with the
URL, no login required — flagged and fixed, per the explicit ask; and (2) even once authenticated,
helmet's default `Cross-Origin-Resource-Policy: same-origin` header would have silently blocked the
client app from loading the file at all in production (client and server are on different origins —
Netlify vs. Render), independent of and in addition to CORS. Built a real inline PDF/image viewer
(authenticated blob fetch, `blob:` object URL, proper create/revoke lifecycle), a clear
unsupported-type message, a Download original button for every type, and explicit loading/error
states — the error state surfaces the server's actual reason (not found / forbidden / expired
session), not a generic message. Also closed an adjacent path-traversal write found while fixing
the same file-naming code (`upload.js`) that the read-side fix touched.

## 7. BUG — dietitian working hours shifted by a UTC-conversion error

A dietitian sets working hours 9:00 AM – 5:00 PM, but clients see slots like
4:00 AM – 11:30 AM. That's roughly a 5-hour shift, which smells like a UTC conversion applied
where it shouldn't be, or applied twice.

Diagnose first. Trace one slot end to end and report back:
- how working hours are stored (wall-clock string vs timestamp vs UTC instant)
- where the conversion happens on write, on read, and on render
- whether the server, the database driver, or the browser is silently applying an offset
- whether `new Date("09:00")` style parsing is being used anywhere

Then fix it with one consistent rule:
- Working hours and blocked times are wall-clock values in the DIETITIAN's timezone. Store the
  dietitian's timezone (IANA name, e.g. Asia/Kolkata) on their profile.
- Actual appointments are stored as UTC instants.
- Convert exactly once, at the display boundary, and label the timezone in the UI.

Requirements:
- Slots shown to a client must match the dietitian's configured hours.
- No double conversion anywhere. Remove any manual offset arithmetic (+5.5, getTimezoneOffset
  math) and use a proper date library the project already has, or date-fns-tz if none exists.
- Handle a client in a different timezone from the dietitian: show the slot in the client's
  local time with the timezone labelled, and store the same underlying instant.

Write tests: a 9-5 schedule renders as 9-5 for a same-timezone client, renders correctly for a
client several hours offset, and an appointment booked at a boundary slot round-trips without
drift.

**Diagnosis and fix**: see `docs/worklog/2026-08-23.md` for the full trace (root cause, every file
touched, and how each requirement/test was satisfied).
