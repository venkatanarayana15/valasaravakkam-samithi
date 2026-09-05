# Responsive pass + planet removal — 2026-09-05

Task: remove the 3D planet animation circle from the homepage hero; make the full website responsive on all devices.

## Planet removal
The "planet" was a 3D CSS emblem (`.emblem` + `.emblem-ring r1/r2/r3` + `.emblem-core`, tilted ring orbit via `rotateX(64deg) rotateZ(0→360deg)` with float + glow) positioned at `right-[7%] top-[16%]` of the hero, visible on `md+`.
- Removed JSX block + `FaOm` import from `Hero.tsx`.
- Removed `@keyframes spin3d`, `@keyframes emblem-float`, `.emblem*` rules from `globals.css`.
- KEPT `@keyframes glow-pulse` / `.animate-glow` — still used by `Coordinators.tsx:54`.
- Favicon + header `sssso-emblem-*.png` logos untouched (different asset, still required).
- Hero now: kenburns background + gradient + floating particles + centered text (unchanged). No layout shift — emblem was absolutely positioned.

## Responsive fixes
| Area | Issue | Fix |
|---|---|---|
| SiteHeader mobile | Long name "Valasaravakkam Samithi" could overflow ~320px | `min-w-0 flex-1` link + `truncate` on name; emblem `shrink-0` |
| SiteHeader desktop | 6 nav pills + logo + socials overflow 1024–1535px (max-w-7xl container) | `gap-4 xl:gap-6`, nav `lg:gap-0.5`/`lg:px-3 2xl:px-4`, social icons + WhatsApp `hidden … 2xl:flex` (dark toggle always visible) |
| Memories grid | 1 column until `md` wasted tablet width | `sm:grid-cols-2`; `sizes` corrected to match |
| CategoryGallery grid | Same gap at tablet | `sm:grid-cols-2`; `sizes` corrected |
| Lightbox header | Title + counter + buttons could overflow 320px | Title `min-w-0 flex-1 truncate`; control cluster `shrink-0`; counter `whitespace-nowrap` |
| Chatbot panel | `min-h-[320px]` forced overflow on short/landscape viewports; desktop panel could exceed 540px | `h-[min(60vh,540px)]`; `lg:bottom-6` (no bottom nav on desktop) |

## Verified
- `npm run build`: PASS (compiled 34.2s, TS clean, 10/10 static pages).
- `npm run lint`: no new issues — full 10 problems pre-existing (Lightbox 91/433/144/282, dark-mode 33/90, admin app.js x3). Changed files clean.
- Static breakpoint review across 320 / 375 / 640 / 768 / 1024 / 1280 / 1440 / 2xl:
  - BottomNav, Footer, ContactSection, Services, Activities, Stats, UpcomingEvents, Coordinators, gallery pages, not-found, thank-you already responsive — no changes needed.
- No browser MCP this session → no live screenshots; verdicts capped at `warn`. Baselines reused from `qa-runs/2026-09-04-site-audit` (375/1440) and `qa-runs/2026-09-05-elder-palette`.

## Residual
- Landscape-phone chat: bottom-anchored above FAB, 60vh cap — usable but panel may not reach screen top in extreme landscape.
- Lightbox gesture refs-during-render lint errors remain (issues register A1).