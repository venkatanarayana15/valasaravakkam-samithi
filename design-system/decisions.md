# Design Decisions (binding)

Past rulings the agent MUST follow. Newest first. Each entry: decision,
reason, date. Overturning an entry requires explicit user approval.

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
