# Nourishly

A nutrition / dietitian ↔ client management platform — a React (Vite) + Node/Express + MySQL
rebuild of a static prototype (kept for reference in `legacy/`).

See `CLAUDE.md` for the full project rules this codebase follows, `docs/ARCHITECTURE.md` for how
the pieces fit together, `docs/API.md` for the full endpoint reference, and `docs/PROGRESS.md`
for what's built and what isn't.

## Stack

- **Client** — React 18 + Vite (JavaScript, no TypeScript), Tailwind v4, shadcn/ui, React Router,
  TanStack Query, react-hook-form + zod, recharts, `@dnd-kit`.
- **Server** — Node.js + Express (ESM), MySQL via `mysql2` (hand-written SQL, no ORM), JWT auth
  (access token in memory, refresh token in an `httpOnly` cookie), zod request validation.

## Local development

```bash
# server — needs a MySQL connection (local mysqld, Docker, or PlanetScale/RDS in prod — see
# server/dev-verify-mysql.mjs for a throwaway local Docker instance)
cd server
cp .env.example .env        # fill in MYSQL_URL at minimum
npm install
npm run db:migrate           # creates the schema (safe to re-run)
npm run dev                  # http://localhost:4000/api/health
npm run seed                  # optional — creates admin@/dietitian@/client@/client2@nourishly.test,
                               # all password Password123!, plus demo recipes/plan/progress/calls/reports

# client, in a second terminal
cd client
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

## Deployment

The client and server deploy as two separate services — there's no shared build step.

### Server → Render or Railway

Both platforms can build directly from `server/Dockerfile`, or run `npm ci && npm start` on a
Node 20 buildpack without Docker at all — either works, since the server has no build step.

1. Create a new **Web Service** pointed at this repo, root directory `server/`.
2. If using the Dockerfile: set the Docker context/build path to `server/`. Otherwise: build
   command `npm ci`, start command `npm start`.
3. Set the environment variables from the **Production `.env` checklist** below.
4. Run `npm run db:migrate` once against the production `MYSQL_URL` to create the schema (it's
   idempotent — `CREATE TABLE IF NOT EXISTS` — safe to re-run on every deploy if you'd rather wire
   it into the build/start command).
5. Note the deployed URL (e.g. `https://nourishly-api.onrender.com`) — the client needs it.
6. Both platforms deploy on git push by default; no extra CI config needed for a first deploy.

**Report uploads** (`server/uploads/`, written by `multer` in `server/src/middleware/upload.js`)
are local disk — Render/Railway's default filesystem is **ephemeral** (wiped on redeploy/restart).
Fine for a demo; for real report persistence, mount a persistent disk (Render: "Disks" add-on) or
swap the storage backend for S3/R2 (flagged as an open decision in `docs/API.md`'s known gaps —
not solved here).

### Client → Netlify

1. Import the repo into Netlify, set the project **base directory** to `client/`.
2. Netlify auto-detects the Vite framework preset; `netlify.toml` in `client/` pins the build
   command (`npm run build`), publish directory (`dist`), and adds the SPA redirect every
   client-routed path needs — without it, a hard refresh on e.g. `/app/overview` 404s on static
   hosting since there's no server-side route to match it.
3. Set `VITE_API_URL` in the Netlify site's environment variables to the deployed server URL
   plus `/api` (e.g. `https://nourishly-api.onrender.com/api`).
4. Deploy. Every push to the connected branch redeploys automatically; PRs get deploy previews.

### Production `.env` checklist

**`server/`** (see `server/.env.example` for the full key list):

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `MYSQL_URL` | A real MySQL (PlanetScale, RDS, or equivalent) connection string — never the local dev default |
| `JWT_ACCESS_SECRET` | A strong random value, different from dev, e.g. `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Same — a **different** strong random value than `JWT_ACCESS_SECRET` |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Fine to leave at the defaults (`15m` / `30d`) unless you have a reason to change them |
| `CLIENT_ORIGIN` | The exact deployed client URL, e.g. `https://nourishly.netlify.app` — used for both CORS and (indirectly) how the refresh cookie behaves; see below |
| `PORT` | Usually set automatically by Render/Railway — only set it yourself if self-hosting |

**`client/`** (see `client/.env.example`):

| Variable | Production value |
|---|---|
| `VITE_API_URL` | The deployed server URL + `/api`, e.g. `https://nourishly-api.onrender.com/api` |

**Why the secrets and origin matter beyond "fill them in":**

- Never reuse the `change-me`/`change-me-too` dev defaults from `server/.env.example` in
  production — anyone can forge a valid access or refresh token if they know the secret.
- `CLIENT_ORIGIN` must match the deployed client's origin **exactly** (scheme + host, no trailing
  slash) — `server/src/app.js`'s CORS config only allows that one origin, and the refresh cookie
  is `sameSite: 'none'` in production (`server/src/controllers/auth.controller.js`) specifically
  because the client and server are different sites once deployed, which also means the cookie
  requires HTTPS (`secure: true`, already tied to `NODE_ENV=production`) — so both services need
  to actually be served over HTTPS, which Netlify/Render/Railway all do by default.
- Netlify deploy previews get a different URL per PR/branch; `CLIENT_ORIGIN` as a single value
  only covers the production client URL. Previews hitting the production API will fail CORS —
  a known limitation, not solved here (would need either a wildcard/allowlist origin check or a
  separate preview API deployment).

## Docs

- `docs/API.md` — full endpoint reference (auth column shows who's allowed to call what)
- `docs/ARCHITECTURE.md` — how auth, request handling, and client data flow fit together
- `docs/PROGRESS.md` — current project status, area by area
- `docs/worklog/` — one file per work day, the detailed build journal
