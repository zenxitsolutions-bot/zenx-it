# CLAUDE.md — ZenX Dietitian project rules

> Save this file at the **root of the repo**. Claude Code reads it automatically on every session.
> These are standing rules. They apply to every task, without being repeated.

---

## 1. Project

**ZenX Dietitian** (formerly Nourishly) — a nutrition / dietitian ↔ client management platform.

The product was renamed on 2026-09-07. Only user-visible text moved: internal identifiers keep the
old name on purpose (the `nourishly_refresh` cookie, `nourishly:*` localStorage keys, the
`nourishly.app` iCalendar UID domain, the `nourishly` database and the `.nourishly-phone-input`
class). Renaming any of those silently invalidates live state — see docs/worklog/2026-09-07.md.
Being migrated from a static `index.html` + `styles.css` + `recipes.css` + `app.js` prototype to a
**React (Vite) frontend + Node.js backend**, in a monorepo:

```
nourishly/
├── client/          # React + Vite (JavaScript)
├── server/          # Node.js + Express
├── docs/
│   ├── worklog/     # one file per day — see §7
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── PROGRESS.md
├── legacy/          # the original html/css/js, kept as visual reference only
└── CLAUDE.md
```

## 2. Stack — do not substitute without asking

**Frontend**
- React 18 + Vite — **JavaScript only, no TypeScript**, `.jsx` files
- Tailwind CSS v4 for styling, with the legacy palette wired in as theme tokens (§4)
- **shadcn/ui** for primitives (Dialog, Sheet, Tabs, Select, Toast, Dropdown, Card, Badge, Progress)
- `lucide-react` — icons (replace the emoji/glyph placeholders in the legacy markup)
- `framer-motion` — page + modal transitions, step animation, card hover
- `react-router-dom` v6 — routing
- `@tanstack/react-query` — all server state
- `react-hook-form` + `zod` — all forms and validation
- `recharts` — progress/weight/analytics charts (replaces the hand-written SVG in `app.js`)
- `@dnd-kit/core` — drag-and-drop recipes into meal slots in the weekly plan builder
- `axios` instance with interceptors — one API client, never bare `fetch` in components

**Backend**
- Node.js + Express (ESM, `"type": "module"`)
- MongoDB + Mongoose (if Postgres is preferred, ask first — do not switch silently)
- `jsonwebtoken` (access + refresh), `bcrypt`, `zod` for request validation
- `helmet`, `cors`, `express-rate-limit`, `morgan`
- Central error handler + `asyncHandler` wrapper — no `try/catch` repeated in every controller

## 3. Hard rules

1. **JavaScript, not TypeScript.** No `.ts`/`.tsx` anywhere.
2. **One component per file.** A file over ~150 lines must be split. A component that does data
   fetching *and* layout *and* form logic must be split.
3. **No business logic in components.** Data goes through hooks in `client/src/hooks/`, which call
   functions in `client/src/api/`.
4. **No secrets in code.** Everything through `.env`, with a committed `.env.example`.
5. **No mock data left behind.** If a screen is built before its endpoint exists, put fixtures in
   `client/src/mocks/` and add a `TODO(api):` comment. Never inline fake arrays in a component.
6. **One design language.** The app follows the ZenX Dietitian theme in §4 — every screen uses
   the same tokens, card treatment, radii and title block. Restyling is fine and expected;
   changing behaviour while restyling is not. A theme change must leave routes, hooks, queries,
   calculations and form schemas byte-identical.
7. **Accessibility stays.** Keep the `aria-label`s, semantic landmarks, focus states and
   keyboard-usable modals from the original markup.
8. **Run it before claiming it works.** `npm run build` on the client and start the server after
   every phase. Fix warnings, don't report them as done.
9. **Ask before deviating** from the stack, folder structure, or data model in §2 / §5.

## 4. Design tokens — the ZenX Dietitian theme

Superseded the original cream/coral palette on 2026-09-07 at the owner's request (see
`docs/worklog/2026-09-07.md`). **`client/src/index.css` is the single source of truth** — the
values below are a summary of it, not a second copy to keep in sync.

```
brand       #087f6b     brand-strong #075f55    brand-mid #159a7c
sage        #ddf4e9     sage-deep    #075f55
cream       #eef7f3     mist (page)  #f6faf8    card      #ffffff
forest/ink  #102a2a     muted text   #607574
line        #e1ece8
accents     hydration #3e9bd1 · calories #e9a23b · measure #db7e9c (ink #a84a66)
shadow-soft 0 1px 2px rgba(0,60,50,.04), 0 4px 20px rgba(0,60,50,.06)
shadow-lift 0 2px 4px rgba(0,60,50,.05), 0 14px 34px rgba(0,60,50,.10)
radius      cards 20px (`rounded-card`), controls 12–16px, pills 999px
```

The token *names* are the original green-palette ones (`forest`/`sage`/`cream`/`coral`) even
though the values are not. That is deliberate: ~570 utility classes reference them, so re-pointing
the values in `index.css` re-skins the whole app from one file. **Prefer the honest aliases**
(`brand`, `brand-strong`, `mist`, `sky`) in new code.

Fonts: **Inter** (everything — headings differ by weight, not family) · **Playfair Display**
still available via `font-display`.
Buttons: the default `<Button>` variant *is* the brand green, with its own hover and shadow.
Many call sites still re-declare `bg-coral text-white hover:bg-coral/90`, which overrides both —
prefer passing only a radius on new code. No hex codes in JSX.

Scope note: the client portal is on the full theme (borders, gutters, title blocks); the dietitian
and admin screens currently take the palette only, by choice — see `docs/worklog/2026-09-07.md`.

Any color that carries text must be checked against its own ground at 4.5:1 (small text) or
3:1 (icons) before it ships — several `*-ink` tokens exist precisely because the matching fill
failed that check.

## 5. Roles and data model

Three roles, matching the legacy portal: **client**, **dietitian**, **admin**.

| Role | Sees |
|---|---|
| client | Overview, This week's meals, My progress, Calls, Reports |
| dietitian | Dashboard, Clients, Weekly plan builder, Recipe library, Schedule calls, Report reviews |
| admin | Business overview, Enquiry pipeline, Clients, Weekly plan, Recipe library, Growth insights |

Core collections: `User` (role, profile, assignedDietitian), `Enquiry` (goal, name, email, phone,
preferredSlot, note, status), `Plan` (client, dietitian, week, meals[]), `Recipe` (title, emoji,
tags, kcal, protein, mealType, notes), `Call` (client, dietitian, scheduledAt, status, notes),
`Progress` (client, date, weight, energy, adherence), `Report` (client, file, review).

## 6. Git

- Small, working commits. Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- A commit must build. Never commit a broken client.
- Branch per phase: `phase/01-scaffold`, `phase/02-marketing`, …

## 7. Daily work log — REQUIRED, every session

At the **end of every working session** (and before finishing any phase), create or update:

```
docs/worklog/YYYY-MM-DD.md
```

Use exactly this template:

```markdown
# Work log — YYYY-MM-DD

**Phase:** <e.g. Phase 3 — Auth>
**Session time:** <start–end>

## Done today
- <what was actually built, one line each, with file paths>

## Files added / changed
| File | Change |
|---|---|
| client/src/components/... | new |

## Decisions made
- <decision> — <why> — <what it rules out>

## Problems hit & how they were solved
- <problem> → <fix>

## Not finished / carried over
- [ ] <item>

## Next session starts with
1. <first concrete task>

## How to run what exists now
```bash
<commands>
```
```

Rules for the log:
- **One file per day**, never overwrite a previous day's file. Same day again → append a new
  `## Session 2` block.
- Write what *actually* happened, including dead ends. This is a build journal, not a brochure.
- Also append a one-line entry to `docs/PROGRESS.md` linking the day's file, so there's an index.
- If the day's work changed the API surface, update `docs/API.md` in the same commit.
- Commit the log with `docs: work log for YYYY-MM-DD`.

## 8. Definition of done for any screen

- Renders on mobile (360px), tablet, desktop — matches the legacy breakpoints (1050px, 650px)
- Loading, empty, and error states exist
- Data comes from React Query, not local `useState` fixtures
- Keyboard reachable, visible focus, labelled inputs
- No console errors or React key warnings
- Work log updated