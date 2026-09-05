# Logo + Loader Pass — 2026-09-05 (Light tier)

## Analysis (why the old mark failed)
- Header used `my-profile-img.png` with `alt="Profile"` — a 2.2MB
  AI-generated fantasy medallion, not the organisation's mark. `logo.png`
  and `apple-touch-icon.png` were byte-identical copies of the same file.
- Fantasy mark defects: invented symbol arrangement (cross/crescent/wheel/Om
  jumbled, no stupa, no flame), garbled ring text, cosmic background that
  dies at 36px, circular crop fighting a square composition.
- No loading indicator existed anywhere; dynamic gallery routes had no
  `loading.tsx` fallback.

## Change
- Official Sarva Dharma emblem from ssssoindia.org
  (`sssso-emblem-192/180/32.png`): header (mobile + desktop, uncropped,
  proper alt), favicon, apple-touch-icon.
- Deleted `logo.png`, `my-profile-img.png`, `favicon.jpg`,
  `apple-touch-icon.png` (~6.8MB reclaimed).
- New `SaiLoader` (blue arc ring + Om, reduced-motion safe) + global
  `app/loading.tsx` (`Sai Ram… loading`).
- decisions.md #7 records the ruling (official mark only, never modified).

## Verification
- `npm run build` green; lint clean on touched files.
- `desktop-header.png`: emblem renders correctly at 44px in dark header.
- Console: 4× `/api/site` 500 (known: admin backend absent, fallback works;
  resolves when CATALYST_SITE_API_URL is set) + 1 Maps permissions-policy
  note (third-party noise). No 404s — no straggler references.
- Stats counters reach final values (132/56/6/20) — earlier "0" readings
  were mid-animation transients, not a bug.
