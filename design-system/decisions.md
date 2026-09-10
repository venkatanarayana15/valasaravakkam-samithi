# Design Decisions (binding)

Past rulings the agent MUST follow. Newest first. Each entry: decision,
reason, date. Overturning an entry requires explicit user approval.

## #16 — Answer engines are first-class citizens (2026-09-09)

GEO stance: AI crawlers explicitly allowed in robots.txt; `/llms.txt`
summarises the network for LLMs. AEO: FAQPage schema + speakable selectors
on home and tenant pages. Rule: every Q&A must derive from shipped content
(never invented); tenant pages use tenant-scoped facts only.

## #15 — Multi-tenant SaaS conventions (2026-09-09)

Single Catalyst project, shared tables, `samithi_id` on every content row;
the function is the sole trust boundary (slug validated, every read
filtered, writes session-checked — no direct table access from browsers).
Slugs immutable, reserved list enforced. 5 theme presets via
`[data-theme-preset]` + live CSS vars (`@theme`, never `inline`);
every preset passes 4.5:1 in both modes (contrast rig before shipping).
Logos fixed across presets. No public signup — owner invites only.

## #15 — 2026 brand ramp: royal → primary → sky; purple removed (2026-09-06)

Deep royal `#0846a8` anchors gradients, primary `#0d6efd` stays the
interactive fill, sky `#38bdf8` replaces washed-out `#149ddd` as the
decorative accent. Admin purple `#6a5cff` is REMOVED everywhere (violated
the 6-color rule). Surfaces: `bg-surface` (#f6f8fb) replaces `#f7f9fc`.
Every gradient in site + admin now flows within one hue family.

## #16 — Legacy static site deleted (2026-09-06)

Root `index.html` + sibling pages, `assets/` vendor tree, `CNAME` and the
GitHub Pages workflow predated the Next.js migration and confused tooling.
Single source of truth is `src/` now. GitHub Pages is NOT a deploy target.

## #17 — Admin data files are runtime state, not source (2026-09-06)

`admin/data/*.json` is the production datastore written by the CMS on every
save; it is gitignored from now on. Fresh clones auto-seed via
`admin/server.mjs` (runs `seed.mjs` when the data dir is empty). Schema
changes go in `seed.mjs`, never by hand-editing tracked JSON.

## #14 — App chrome follows the active theme; only photographic surfaces stay fixed (2026-09-05)

Site header (both bars), bottom nav pill, and admin sidebar all switch
light/dark with the theme — no permanently-navy chrome. Exempt: hero photo,
map iframe, and imagery. Brand title uses the mode-aware static gradient;
toggle affordances keep ≥44px targets and visible hover in both modes.

## #13 — Light-first: OS preference never auto-darkens site or admin (2026-09-05)

First paint is always light; dark applies only to an explicit stored choice
(layout FOUC-guard, provider init, admin `getPreferredTheme`). Rationale:
elder-first readability baseline + deterministic screenshots. Toggle still
offers dark on both surfaces.

## #12 — Admin boot lookups must be null-safe (2026-09-05)

`applyTheme` wrote to a removed `#theme-label` and `render()` to a removed
`#page-title`; either top-level throw kills the entire admin SPA (blank
dashboard, add/delete "missing"). Rule: every `$()` against markup that can
drift gets a guard; toggle icons are CSS-owned, JS never overwrites them.

## #11 — Class-based dark mode is real: `@custom-variant dark` (2026-09-05)

Tailwind v4 defaults `dark:` to `prefers-color-scheme`, which silently made
the in-app toggle a no-op. `globals.css` pins `dark:` to `.dark` so the
provider/toggle/FOUC-guard work as documented. Revert = delete one line.

## #10 — All loading spinners centre the official SSSSO emblem (2026-09-05)

`SaiLoader` (site) and `showSpinner` (admin) show the genuine emblem, static
and unmodified, inside a spinning Sai-blue arc that halts under
`prefers-reduced-motion`. Emblem `aria-hidden` where status text carries meaning.

## #9 — Upcoming Events are twin-crest light cards, no photo backgrounds (2026-09-05)

Emblem left + Centenary `100 years` logo right (square, unrounded), date pill,
title, location, description. Centenary asset:
`public/assets/img/sathya-sai-100-years-logo.png` (512px web resize of the
user-supplied HQ; transparent). Calm slide carousel, 6s autoplay, off under
reduced-motion. Event admin form drops `image`.

## #8 — Elder-first palette: fewer colors, stronger contrast (2026-09-05)

Most users are elders. Rules: max 6 functional colors (primary, primary-dark,
accent-decorative, navy, body text, muted); interactive fills are `bg-primary`
(white text ≈ 4.5:1), never sky `#149ddd` fills with white text (≈ 3:1);
`#149ddd` is decorative-only (dividers, gradients, large display); body-muted
is `#475569` (≈ 7:1 on white); no purple `#6a5cff` anywhere; bottom-nav labels
≥ 10px; focus rings primary at 40% opacity. Every new color must state its
contrast pair before merging.

## #7 — Official Sarva Dharma emblem only; no AI medallions (2026-09-05)

Header, favicon and apple-touch use the genuine SSSSO emblem
(`sssso-emblem-{192,180,32}.png`, sourced from ssssoindia.org). The old
AI-generated medallion (`logo.png`, `my-profile-img.png` — identical files)
is deleted: wrong symbol arrangement, unreadable at small sizes, unusable
circular crop on a lotus mark. Emblem is never rounded, never recolored,
never modified (org trademark rules). Loader is the Sai ring (blue arc +
Om, `SaiLoader.tsx`), shown via `app/loading.tsx` on dynamic routes.

## #6 — Category is Hindu devotional organisation (2026-09-04)

The skill generator labeled this project "Church/Religious Organization".
Wrong frame, wrong connotations. Always: Hindu devotional organisation,
Sathya Sai Seva Organisation, Chennai Metro West.

## #5 — Fonts are Poppins + Raleway only (2026-09-04)

Generator proposed Righteous display font. Rejected: the codebase loads
Poppins (body) + Raleway (display) via `next/font/google` in `layout.tsx`.
No third font, no raw Google Fonts links, ever.

## #4 — Sai blue over generator purple (2026-09-04)

Generator palette (`#7C3AED` primary, gold CTA, lavender surfaces) rejected.
Code truth wins: primary `#0d6efd`, accent/CTA `#149ddd`, dark bg `#0f172a`.
No invented hexes — every color must come from MASTER.md.

## #3 — Chatbot is rule-based, not LLM (2026-09-04)

Support-agent pattern adapted as a deterministic FAQ engine over live
`useSiteData()`. Zero API cost, offline-capable, in sync with the admin CMS.
Revisit only if the FAQ domain outgrows keyword matching (then: RAG over
site content, still no blind LLM).

## #2 — Playwright + DevTools MCP over autonomous browser frameworks (2026-09-04)

Browser Use / Stagehand / Skyvern rejected for dev-QA duty: they need LLM
keys, cost more tokens, and cede the agent loop. A11y-tree tools
(Playwright MCP) + console/network tools (chrome-devtools MCP) stay.

## #1 — Feb 2026 Vite-era MASTER.md quarantined (2026-09-04)

`design-system/_archive/2026-02-11-vite-era/` holds the stale file. Cause:
memory predated the Next.js migration and no quarantine rule existed.
The agent spec now mandates stack-checking memory before following it.
