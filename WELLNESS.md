# Oat & Sage wellness workspace

A responsive React demo inspired by the supplied cream-and-sage reference.

## Run

From this directory, run `npm install`, then `npm run dev`. Open http://localhost:5175.
Run `npm run build` for a production bundle in `dist/`.

## Included

- Overview with client summary, consultations, weekly calendar, and client corner
- Searchable client directory and validated add-client form
- Meal inspiration, recipe details, and persistent recipe bookmarks
- Mood and note check-ins with a progress history
- Local message drafts and editable profile
- Responsive desktop and mobile layouts, keyboard accessible native dialogs

## Demo boundaries

This frontend uses sample client and schedule data. Client additions, bookmarks, check-ins, profile edits, and message drafts are stored in this browser's localStorage. It is not connected to the separate zenx-wellness backend, authentication, messaging, or a video provider. Images and fonts use external hosts. The original marketing components and separate wellness application remain in their existing directories.

## Verification

Production build passed. Browser checks covered desktop and 390px phone layout, no horizontal page overflow on phone, client filtering, add-client dialog, and recipe bookmark persistence after reload.
