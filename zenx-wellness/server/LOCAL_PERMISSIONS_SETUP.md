# Local permissions setup

Normal setup now recognizes the main admin created by ZenX automatically after trusted provisioning
or ZenX sign-in/handoff. Legacy companies qualify only with one unambiguous active ZenX Wellness
admin; existing owners are preserved. Both APIs and their schema prerequisites must be current.
See [the activation checklist](../PERMISSIONS.md). The manual local helper below remains available
for an explicitly selected company admin; it is not a substitute for the new admin schema migration.

Run from this server directory only after confirming the local database and the intended existing company administrator:

```powershell
node src/scripts/setupLocalPermissions.js --company-slug <company> --email <existing-admin-email> --confirm
```

The command refuses production mode and non-literal-loopback MySQL hosts (use `127.0.0.1` or `[::1]`). It requires an ACTIVE company and exactly one active admin with the supplied email. It does not create an account, change a password, grant access to another company, or transfer existing ownership.

It adds only missing `auth_sessions`, `company_access_control`, `user_permissions`, and `permission_audit` tables; existing table engines and column sets must match. It does not run historical migrations or backfills. MySQL DDL is not transactional: if a later check fails, new empty tables may remain. Never drop them as automatic cleanup.

The final owner assignment and audit are transactional and verified. Sign out and back in after successful setup. Existing staff retain their role defaults until their permissions are changed.

Failures log safe error codes only. `ERR_LOCAL_SETUP_OWNER_CONFLICT` means another main admin already exists; stop rather than overwrite. `ERR_LOCAL_SETUP_TABLE_ENGINE` or `ERR_LOCAL_SETUP_TABLE_COLUMNS` requires a manual schema review, not a destructive reset. This command is not for production deployment.

## Local API testing

From the repository root, run these in separate terminals after preparing each server's Git-ignored
`.env` with its loopback database URL and `EMAIL_TRANSPORT=console`:

```powershell
node scripts/serve-local-api.mjs wellness
node scripts/serve-local-api.mjs admin
```

These launch the real API code on loopback ports 4000 and 4001 without starting background email,
reminder, plan-expiry or appointment-generation jobs. They refuse production configuration. Stop
an existing API on the same port first; the launcher never kills another process automatically.
The ZenX admin database also needs its additive `auth_sessions` table and the nullable
`companies.main_admin_user_id` column from `admin-server/src/db/schema.sql`. Review all pending
changes before running its migration; the local permissions helper does not alter the admin database.

The company sign-in page is `http://localhost:5174/<company>/login`. Open the dietitian application
after signing in, then visit `http://localhost:5173/<company>/app/permissions`. Keep the existing
local application handoff secret synchronized across the ZenX application record and Wellness
configuration; never print or commit it. Account passwords are not changed by owner setup.
