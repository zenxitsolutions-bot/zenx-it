# ZenX Admin Portal

Private CRM / enquiry management / business growth dashboard for ZenX IT Solutions Pvt Ltd. Manages website enquiries, follow-ups, conversions, customers and ZenX Dietitian / ZenX POS application accounts.

Stack: React + Vite + TypeScript, Tailwind CSS, React Router, Recharts, React Hook Form, Zod. Backend is [`admin-server/`](../admin-server) — a plain Node/Express + MySQL API (bcrypt + JWT auth, no ORM) — **not** Supabase; the `supabase/` folder in this directory is the old, retired design, kept only for historical reference.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5174. **No setup required** — with no `VITE_ADMIN_API_URL` configured, the app automatically runs in **demo mode** against a realistic seeded dataset (15 enquiries across every pipeline stage, follow-ups due today/overdue/upcoming, two converted customers with application access, four admin users with different roles). Data persists to `localStorage` between reloads; reset it any time from Settings → "Reset demo data".

Demo login: any seeded admin email (shown on the login screen) + password `ZenXDemo123!`.

## Connect the real backend

1. Set up and run [`admin-server/`](../admin-server) (see its own setup — `npm install`, `.env` from `.env.example`, `npm run db:migrate`, `npm run seed`, `npm start`).
2. Copy `.env.example` to `.env.local` and set:
   ```
   VITE_ADMIN_API_URL=http://localhost:4001/api
   ```
3. Restart `npm run dev`. The app detects the env var and switches from demo data to the live API automatically — no code changes.
4. Sign in with the seeded Super Admin from `admin-server/src/seed.js` (`admin@zenxitsolutions.com` / see that file for the password) at `/admin/login` — note this is a **different login page** from `/login`, which is for a *customer* (a provisioned company's own user) launching into their application via the SSO handoff.

## How demo vs. live mode works

Every data operation goes through `src/services/*.ts`. Each service checks `isDemoMode` (from `src/lib/apiClient.ts`, true whenever `VITE_ADMIN_API_URL` is unset) and either:
- reads/writes the in-memory, localStorage-backed store in `src/services/demo/`, or
- calls `admin-server`'s REST API via the shared `apiClient` (axios instance, bearer token + 401-refresh-retry).

## Project structure

```
src/
  types/domain.ts     every enum + row type (Enquiry, Interaction, Followup, Customer, ...)
  lib/apiClient.ts     axios client for admin-server + demo-mode detection
  services/            one file per domain, demo-mode + live-API implementations side by side
  services/demo/       seeded dataset + the reactive local store
  hooks/                useLiveQuery (data fetching + demo reactivity — no live push in API mode,
                        see admin-server's own README/worklog note), useEnquiryWorkflow
  context/              Auth, Toast, Confirm providers
  layouts/              AdminLayout (sidebar + topbar), AuthLayout
  components/           ui primitives, layout, dashboard, pipeline, enquiries, customers, analytics
  pages/                one per route — auth/ (staff, /admin/login) vs. customerAuth/ (/login,
                        /launcher, /change-password)
```

## Deploying

`netlify.toml` builds this as a static SPA (`npm run build` → `dist/`). Set `VITE_ADMIN_API_URL` to the deployed `admin-server` URL in Netlify's env vars before building. See `admin-server/render.yaml` for the backend's own deploy config and required env vars — the two share one secret (`ZENX_DIETITIAN_HANDOFF_SECRET` / wellness-app's `ZENX_HANDOFF_SECRET`) that must be set identically in both places.

## Notes

- Password hashes (bcrypt) live in `admin-server`'s MySQL database — this app never sees a plaintext password after account creation. Customer accounts get a temp password at provisioning time (forced change on first login); admin invites work the same way.
- The conversion workflow strictly follows: dragging/moving a lead to **Converted** never auto-creates a customer account — it always asks first (see `ConvertFlow.tsx`).
- Growth Insights (Analytics page) only issues a source-level spend recommendation once a source has 10+ leads; smaller samples are shown but flagged as insufficient data.
