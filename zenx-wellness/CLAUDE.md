# CLAUDE.md — Nourishly project rules

> Save this file at the **root of the repo**. Claude Code reads it automatically on every session.
> These are standing rules. They apply to every task, without being repeated.

---

## 1. Project

**Nourishly** — a nutrition / dietitian ↔ client management platform.
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
6. **Preserve the visual design.** The rebuild must look like the original — same palette,
   typography, spacing feel, rounded cards, soft shadows. This is a port, not a redesign.
7. **Accessibility stays.** Keep the `aria-label`s, semantic landmarks, focus states and
   keyboard-usable modals from the original markup.
8. **Run it before claiming it works.** `npm run build` on the client and start the server after
   every phase. Fix warnings, don't report them as done.
9. **Ask before deviating** from the stack, folder structure, or data model in §2 / §5.

## 4. Design tokens — carry these over exactly

```
forest      #173f36     forest-2  #0e3028
sage        #dce9d8     sage-deep #679873
cream       #fbf8f1     peach     #fde2d3
coral       #ec7958     yellow    #f7d776
ink         #193b34     muted     #6f807a
line        #e4e6dd
shadow      0 18px 50px rgba(31,68,56,.11)
radius      cards 12–18px, pills 999px
```

Fonts: **Playfair Display** (headings, `h1`–`h3`, brand, prices) · **DM Sans** (everything else).
Buttons: `btn-coral` (primary), `btn-forest` (dark), `btn-outline` (ghost).
Expose these as Tailwind theme tokens (`bg-forest`, `text-coral`, `shadow-soft`) — no hex codes
sprinkled through JSX.

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