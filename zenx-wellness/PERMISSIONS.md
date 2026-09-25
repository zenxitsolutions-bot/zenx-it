# Team permissions

Implemented in the Wellness company portal, not the separate ZenX platform-operator console.
The API enforces permissions as well as the navigation and action buttons. Existing company,
role and assigned-client restrictions still apply; a capability never grants cross-company access.

## Access model

- Each company can explicitly designate one existing active admin as its main admin. This account
  always has all supported capabilities and cannot be restricted, demoted or reset by a subordinate.
- The main admin can grant **Manage other users' permissions** to selected admin users.
  Delegates cannot change themselves, the main admin, or another permission manager, and cannot
  grant new access they lack. Only the main admin can appoint or remove permission managers.
- Existing accounts without saved overrides retain their prior role capabilities. No account is
  automatically promoted. New staff receive role defaults capped by their creator's own access;
  they never automatically become permission managers.
- Separate controls cover email/phone visibility; client and staff creation/editing; temporary
  password generation/reset; viewing, editing, publishing and deleting diets; recipes; reports;
  calls/schedules; messages; enquiries; packages; insights; organisation details and email logs.
- Viewing dependencies are enforced on both sides. Turning a prerequisite off also disables its
  dependent actions. Publish-only users may publish an existing draft without editing its content.
  Editing or deleting an already published plan additionally requires publish permission.
- A dietitian explicitly granted client creation creates clients assigned to themselves. A
  dietitian granted password resets can reset only their assigned clients. Restricted admins cannot
  use account edits or password resets to take over more privileged staff.
- Saving permissions atomically writes the permission audit and revokes the target's existing
  sessions. They must sign in again. Fresh requests use current database permissions; live
  messaging rechecks access. Already completed requests or information already delivered cannot
  be recalled.

## Operator activation (not performed by the code change)

1. Back up the database and test the matching API/client release in staging. Retain the sibling
   `shared/` directory in API artifacts and frontend build checkouts. Docker's build context is now
   `zenx-wellness/`, with `server/Dockerfile` (not `server/` as context).
2. Review and run the existing `npm run db:migrate` from `zenx-wellness/server` against the intended
   environment. This release adds `company_access_control`, `user_permissions`, and
   `permission_audit`. The general migration also contains earlier migrations; review these before
   running it against an older database. Deploying the new API without these tables will fail.
3. Obtain explicit confirmation of the company slug and existing main-admin email. Then, in that
   same server/environment, a trusted operator runs:

   ```text
   node src/scripts/setMainAdmin.js --company-slug <company> --email <existing-admin-email> --confirm
   ```

   This deliberately requires an active admin already in that company, is idempotent for the same
   owner, and refuses to transfer ownership. It is never invoked by startup, migration or login.
4. Sign in again as the main admin and open **Team permissions** in the sidebar
   (`/:companySlug/app/permissions`). Select an admin/dietitian, choose access and save.
   Grant permission management only to the explicitly selected admins. Until initialization, the
   page explains that setup is required and permits no permission changes.
5. Test with separate staff sessions: blocked API requests, restricted contact fields, contact
   edits, diet draft/publish actions, downloads, selectors, and session revocation. Verify company
   isolation and assigned-client boundaries in an isolated MySQL staging environment.

The initial code implementation did not migrate a database or initialize an owner. A subsequent
explicitly authorized local setup initialized the selected test-company owner and added the local
prerequisite tables only. Production ownership, Git push and deployment remain separate actions.
Platform operators and database/infrastructure operators
remain trusted administrators outside this company-level permission model.

## Privacy boundaries

Structured email/phone fields are omitted from restricted staff JSON responses, PDF inputs, and
app-generated staff notifications/calendar invites. Contact visibility is independent for email
and phone; users retain access to their own profile contacts. New-account forms may accept contact
details supplied by the creator even when they cannot subsequently browse stored contact details.

These controls are not content filtering: free-text messages, notes, user-supplied names,
uploaded documents, and previously downloaded/exported information may contain contact details.
Existing emails, calendar events, external provider copies, browser downloads and screenshots are
not retroactively removed. Do not put hidden contact details into free-text content.

New queued staff call/schedule/meal-swap emails are bound to a stable account and company, then
rechecked at delivery against the current email address and permissions. Pre-release queued staff
jobs without this identity now fail closed rather than guessing the recipient by email. Manual
retry alone will not repair them: review and deliberately regenerate any still-needed notification
from its valid current event. No queue rows were deleted or resent during implementation. Client
notification jobs are unaffected by this staff-only identity check.

Permission audits are stored in the database; a separate audit-history UI and ownership-transfer
workflow are not included. Owner recovery requires a separately authorized operator procedure.

## Local checks

Use the mocked API unit tests (`npm test` in `server/`) and client library tests
(`node --test src/lib/*.test.js` in `client/`), plus the client production build and lint.
Do not run database integration suites against live data. The new tests exercise delegation,
escalation/tenant denial, contact redaction, notification filtering, password resets, publication
races and current-read permission locking. Browser smoke checks use synthetic users and an
in-memory API adapter, never real account changes.

Verification on 2026-09-24: all 267 mocked Wellness API tests and 65 client tests passed.
The client production build passed; lint completed with
15 existing warnings. The synthetic browser smoke check verified independent contact toggles,
save feedback, immutable owner controls, delegated-manager limits and the setup-required state.
Screenshots were unavailable, so this was an interaction/DOM check, not pixel-level verification.
The temporary preview and fixtures were removed afterward. Docker image and live MySQL staging
integration were not exercised in that verification pass; production rollout and production owner
activation remain outstanding. The later local setup verified the selected owner against local MySQL.
