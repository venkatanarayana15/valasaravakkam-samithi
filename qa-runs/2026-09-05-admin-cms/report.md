# Admin → website CMS reflection — 2026-09-05

Goal: content added/edited/deleted in the admin (events, coordinators, services, stats, activities, gallery, about, site settings, nav links) reflects on the main website.

## Root cause (why edits didn't reflect)
1. **`mergeApi` fell back to static when a collection was empty.** Deleting all events in admin → site pulled the static Ratha Mahotsavam events back in.
2. **Every homepage component re-fell-back again** (`.length ? live : static`) — the same static resurrection at render time.
3. **About field shape mismatch** — admin edited `about` as `{heading, text}` but the site renders `{heading, items:[{strong,text}]}`; saving destroyed the nested items.
4. **No way to edit nav links** — `navLinks` were hard-coded in the site.

## Changes
### Site (`src/`)
- `lib/data-shape.ts` — presence-based `pick()`: a collection key present in the API payload is trusted even when empty; only absent keys fall back to static. Added `navLinks` (from `siteconfig.navLinks`) to `SiteData`/merge/toApiShape.
- All content components now render the provider value directly and **hide the section when empty**:
  `UpcomingEvents`, `Services`, `Stats`, `Activities`, `Coordinators`, `Memories` (hooks before early return), `AboutSection`, `gallery/page.tsx` (empty state message).
- `lib/data.ts` — `UpcomingEvent.date?: string` added (rendered as the card badge via `event.date`).
- `UpcomingEvents.tsx` — badge shows `event.date` when present, else "Save the Date"/"Day n".

### Admin (`admin/`)
- `FIELD_DEFS.events` — added `date` field.
- `FIELD_DEFS.about` — `items` as JSON field (real nested shape).
- `renderField` — `type: "json"` renders pretty-printed textarea; `collectForm` parses it and aborts with a toast on invalid JSON.
- Site Settings editor — new **Navigation Links** section (label/href/icon rows, add/remove) saved into `siteconfig.navLinks`; the `sc2` collector now skips `nav-*` inputs.

## Proof (live, end-to-end)
- POST event via admin API → `/api/site` (admin) → `/api/site` through the Next dev rewrite all show the new event (5 events, "Test CMS Event [Sept 20, 6:00 PM]").
- Cleared events to `[]` → site returns `events: []` (no static resurrection). Restored backup → back to 4.
- `npm run build` PASS; `npm run lint` no new issues (10 pre-existing only).

## How to make an edit reflect
1. Start admin: `cd admin; ADMIN_TOKEN=<token> npm start` (http://localhost:3001).
2. Edit/add/delete content in the SPA (Site Settings now includes nav links; Events include a date badge).
3. Click **Save All** (or per-item save) — data writes to `admin/data/*.json`.
4. Reload http://localhost:3000 — sections render admin content; empty sections disappear entirely.

## Notes
- If `CATALYST_SITE_API_URL` is set in the deploy env, the site reads Catalyst first; Catalyst is currently NOT deployed, so leave it unset and admin remains the source of truth.
- Seed events still contain stale July content — replace them in admin (open question B1).