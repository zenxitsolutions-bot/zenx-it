# Security and scaling hardening — deployment notes

## Status

These changes were implemented and tested locally and prepared for the user-requested GitHub
publication together with the enquiry, diet-plan, permissions and image updates. Git publication
does **not** apply live database migrations or AWS/Nginx configuration; the production activation
steps below remain required. This is targeted application hardening, not a penetration test,
compliance certification, or a measured capacity guarantee.

## What changed

- Both APIs store hashed refresh sessions, rotate refresh tokens, and reject revoked/replayed
  sessions. Logout and password changes invalidate subsequent authenticated requests. Password
  resets consume the link, retire sibling links and revoke sessions in one transaction.
- Existing sessionless JWTs are rejected. The web clients coordinate refresh requests, including
  across same-origin tabs where Web Locks is supported. SSO handoff links are single-use.
- Wellness clears private query caches at logout/account changes and rejects stale request
  results. Message caches are account-scoped and reset when the conversation's assignment changes.
- Account/provisioning responses exclude password hashes and authentication secrets. API/server
  errors use safe metadata, and request logs omit query strings containing reset or OAuth tokens.
- Wellness client-welcome emails use expiring password-setup links instead of emailed passwords. Raw setup links
  are generated at delivery and are not persisted in the email queue. Email-log endpoints hide
  secret-bearing legacy parameters and provider error details. Console previews omit sensitive
  email contents; real delivery requires an explicitly configured provider. Admin customer
  welcomes still link to login and refer to the separately provided password; staff invitations
  use setup links.
- Production configuration rejects missing/development signing secrets and invalid origins.
  Database URIs are validated before driver construction without echoing credentials. Proxy
  trust must name the real proxy addresses; blanket trust is rejected.
- Unsafe browser requests from untrusted origins are rejected before route handling, including
  refresh/logout requests that use cookies. CORS alone does not provide this check. Requests
  without browser-origin headers remain available for server-to-server integrations.
- Uploads have bounded multipart sizes, signature/MIME/extension checks, randomized names and
  authorization before persistence. Report feedback checks assigned-client ownership. Public
  upload serving is limited to raster company logos; private reports remain authenticated.
- Message history uses cursor pages (50 by default, maximum 100) instead of returning the entire
  thread. Older messages load on demand. Live events recheck the session/account/company; idle
  revoked connections close on the next heartbeat (up to 25 seconds), and expired tokens close
  the stream.
- Vulnerable dependency versions were upgraded, including bcrypt, Express/Multer, Vite and the
  admin router. Existing bcrypt password hashes remain compatible; no password rehash migration
  is required. Demo seeding is blocked in production.

## Deployment checklist — operator action required

1. **Back up and test in staging first.** Snapshot both databases and existing uploads. Retain
   the previous API/frontend artifacts and environment configuration for rollback. Review the
   complete pending diff, including the pre-existing enquiry and diet-plan features.
2. Use **Node 24 LTS** for all five packages. Run `npm ci` in the repository root, `admin`,
   `admin-server`, `zenx-wellness/client` and `zenx-wellness/server` using the committed lockfiles.
   Build all three frontends with their correct production API URLs. Never place database,
   signing, mail-provider or integration secrets in a `VITE_*` variable.
3. Set `NODE_ENV=production` for both APIs. Set an explicit `MYSQL_URL` for each database. Admin's
   optional `WELLNESS_MYSQL_URL` is required only if using direct cross-app provisioning. URLs
   must use `mysql://` with a user, host and database; percent-encode special characters. Only
   validated connection options are accepted (see each `.env.example` and `config/security.js`).
   Use least-privilege runtime database users, private networking and verified TLS when crossing
   hosts. The migration identity may need additional schema privileges.
4. Generate **distinct, randomly generated signing secrets of at least 32 characters**:

   | API | Required signing variables |
   | --- | --- |
   | Admin | `ADMIN_JWT_ACCESS_SECRET`, `ADMIN_JWT_REFRESH_SECRET`, `CUSTOMER_JWT_ACCESS_SECRET`, `CUSTOMER_JWT_REFRESH_SECRET` |
   | Wellness | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` |

   If SSO is enabled, `ZENX_DIETITIAN_HANDOFF_SECRET` on admin and `ZENX_HANDOFF_SECRET` on
   wellness must match each other, but not the JWT secrets. **Also verify the existing admin
   `applications.handoff_secret` row**, because issuing SSO uses that stored value; changing an
   environment variable does not automatically rotate an existing database row. Coordinate any
   live rotation; none has been performed here. Rotate credentials previously pasted into chat
   or exposed in historical logs using your approved secret-management process.
5. Configure explicit **HTTPS origins**, with no paths or query strings. Admin `CLIENT_ORIGINS`
   must list the **admin frontend first** (password-reset/invite links use it), followed by the
   marketing origin and any other genuinely trusted frontend. Wellness `CLIENT_ORIGIN` is its
   canonical frontend URL; `CLIENT_ORIGINS` optionally adds trusted origins. Do not add arbitrary
   preview domains. Ensure the SPA host handles direct reset, login and enquiry routes.
6. Set `TRUST_PROXY` to the actual reverse-proxy IPs/CIDRs. Use `loopback` only for a same-host
   proxy when the API cannot be reached directly from the internet. Default `false` is safe for
   direct connections but groups proxy traffic under one IP for rate limiting. For a load
   balancer, restrict backend ingress to that balancer and explicitly configure trusted proxy
   addresses. Do not use `true`, an unrestricted CIDR or a guessed hop count.
7. **Run both migrations before restarting the updated APIs**:

   ```text
   admin-server:         npm run db:migrate
   zenx-wellness/server: npm run db:migrate
   ```

   These create the new `auth_sessions` tables without deleting existing accounts. The pending
   admin migration also allows blank optional enquiry fields. Review all existing migrations in
   staging, not just the new table. Do **not** run demo seeds on production.
8. Deploy both APIs and their matching frontends in a coordinated release. `/api/messages` now
   returns `{ messages, pageInfo, conversation }`, not a bare array. Old frontend bundles must be refreshed.
   **All users will need to sign in again.** Do not mix old/new API versions behind a load
   balancer. Note that wellness's existing `npm start` invokes a `prestart` migration and recipe
   catalogue sync; review that behavior before using it as a production launch command.
9. Configure SMTP or Resend and a verified sender. Test setup, reset and invite delivery in
   staging with designated test accounts. Wellness setup/reset links default to 60 minutes;
   `PASSWORD_RESET_TOKEN_TTL_MINUTES` accepts 1–1440. Previously queued welcome emails generate
   fresh links on delivery; legacy unsafe non-welcome queued jobs fail closed.
10. Validate health endpoints, sign-in/refresh/logout, password reset, tenant separation, report
    access and upload, company logos, chat history/live reconnect and public enquiries. Check
    HTTPS cookies, allowed-origin behavior and real client-IP rate limits through the actual
    proxy. Roll back matching API/frontend artifacts together if needed; the additive session
    table can remain. Do not drop tables or overwrite newer user data as a rollback shortcut.

## Upload and preview compatibility

- Company logos: PNG, JPEG or WebP, up to 2 MB. Reports: PDF, PNG, JPEG or WebP, up to 10 MB.
  Recipe images use the image formats, not PDF. SVG/HTML and other active formats are rejected.
- Existing unsupported private files are download-only; legacy unsupported public logos are
  not served. Their files/database records were not deleted. Replace them through normal UI.
- Check that Nginx, a CDN or object-storage rules do not independently expose the entire uploads
  directory. The API cannot protect files served through an alternate public route.
- PDF frames are isolated from the application's origin. Some browsers block their PDF viewer
  in a sandbox; a visible **Download original** fallback is provided. This browser behavior is
  documented by [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox).
  Image previews require matching server MIME and filename types.
- Signature checks are **not malware scanning or full image/PDF decoding**. Storage quotas,
  antivirus/quarantine, pixel/decompression limits and safe orphan-file cleanup remain future
  work. Existing uploads and secret-bearing historical email rows/logs were not purged.

## What is still needed for larger scale

The application is **not yet a multi-instance architecture**. Current chat/presence fan-out and
rate-limit counters are process-local; uploads use local disk. Before adding API replicas:

- Move uploads to private shared object storage with authorization-preserving downloads.
- Use shared pub/sub for live messages and a shared rate-limit store.
- Coordinate background jobs so multiple replicas do not send duplicate reminders/emails.
- Set explicit database pool budgets across replicas; profile queries, add measured indexes,
  and paginate other large lists as needed. Plan retention/cleanup for expired sessions and
  reset tokens without deleting still-relevant one-use handoff records.
- Add load tests, latency/error/queue/database/disk metrics, alerting, backups with restore
  drills, and health-aware deployment/load balancing. Configure edge request/body limits,
  HTTPS/security headers and abuse protection. Review authenticated upload concurrency because
  files are held in bounded memory before being written.

AWS security groups, IAM, secrets storage, database exposure, TLS termination, backups, WAF,
autoscaling and production monitoring have **not** been changed or certified by this code work.

## Verification and safe test commands

Company-level staff permission controls have a separate activation checklist in
[`zenx-wellness/PERMISSIONS.md`](./zenx-wellness/PERMISSIONS.md). They add three database tables,
require an explicitly selected company main admin, and require the sibling `shared/` directory
in deployment artifacts. Docker's wellness build context is now `zenx-wellness/`, not `server/`.
The verification counts below describe the earlier general-hardening pass; the permissions
checklist records its later feature-specific checks.

Local verification completed on 2026-09-24:

| Check | Result |
| --- | --- |
| Marketing unit tests | 12 passed |
| Admin API unit tests | 82 passed |
| Admin client token-generation tests | 4 passed |
| Wellness API unit tests | 199 passed |
| Wellness client library/lifecycle tests | 55 passed |
| Marketing, admin and wellness frontend production builds | Passed |
| Admin TypeScript check | Passed |
| Dependency audits across all five packages | 0 reported vulnerabilities |
| Browser smoke checks | Admin recovery navigation, consultation enquiry navigation, paged synthetic chat and document fallback |

The frontend builds retain bundle-size advisories; they are not load tests.

Automated tests use synthetic data and mocked database calls. No live database migrations,
credential rotations or emails were performed. An earlier legacy integration-test invocation
attempted a database connection and failed authentication; subsequent verification was restricted
to unit tests. Browser smoke checks used isolated previews and a mock transport, not real accounts.
Screenshots were unavailable, so PDF rendering and pixel-level appearance were not verified.

```text
root:                   npm test && npm run build
admin:                  node --test tests/*.test.js && npx tsc --noEmit && npm run build
admin-server:           node --test tests/unit/*.test.js
zenx-wellness/client:   node --test src/lib/*.test.js && npm run build
zenx-wellness/server:   npm test
each package:           npm audit
```

Wellness `npm test` now runs unit tests only. Database-writing integration tests require the
explicit `RUN_INTEGRATION_TESTS=1` opt-in, reject production, and must point only to an isolated
disposable database; the profile-photo suite additionally requires `TEST_PROFILE_PHOTOS=1`.
Zero reported dependency vulnerabilities is useful evidence, not proof that the application is
free of security defects.
