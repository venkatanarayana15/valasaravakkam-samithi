# Issues-Left Analysis — 2026-09-05 (Standard tier, analysis-only pass)

**Scope:** remaining issues after the palette/Catalyst/chatbot milestone (commit `9d635ce`).
**Method:** ui-ux-designer deep code review (Lightbox.tsx, dark-mode.tsx, admin/public/app.js)
+ static runtime/data-chain review + re-verification of the 2026-09-04 audit findings against
current code. Live browser re-capture was NOT possible this session (browser MCP not connected);
runtime console claims reuse the documented 2026-09-04 / 2026-09-05 captures → any live-only
verdicts are capped at `warn`.

## A. Code defects we can fix (priority order)

### A1. BLOCK — Lightbox mid-gesture lag; refs read during render
- `src/components/Lightbox.tsx:433` — `transition:` ternary reads `panRef.current.active` /
  `pinchRef.current.active` during render. Ref mutation in touch handlers does NOT re-render, so
  the 300ms transform transition can stay active *while the finger drags* → image visibly lags
  behind touch (first frames of every pan/pinch).
- Fix (safe, minimal): add `const [gestureLive, setGestureLive] = useState(false)`; set `true` in
  `onTouchStart` pan+pinch branches and `false` in `onTouchEnd`; render reads `gestureLive` only.
  Keep refs for geometry. Effort: S.

### A2. WARN — Lightbox is not an accessible dialog
- `src/components/Lightbox.tsx:364` — no `role="dialog"` / `aria-modal="true"`, no focus move on
  open, no focus restore on close, no Tab trap (background stays in the DOM/tab order).
- Fix: dialog semantics + focus management; `Escape` already closes (also `preventDefault`).
  Effort: M.

### A3. WARN — Lightbox: reset effect is redundant + extra render (set-state-in-effect)
- `Lightbox.tsx:90-94` — the `[index]` effect duplicates resets already done in `navigate()`
  (`:76-87`, incl. `setLoaded(false)`) and `close()` (`:65-73`). It adds a guaranteed extra render
  per navigation. Safe fix: delete the effect (all index changes already route through `navigate()`)
  or use the roving "previous index" render-reset pattern if external index changes are ever added.

### A4. WARN — Lightbox lacks `onTouchCancel`
- `Lightbox.tsx:281-340` — only `onTouchEnd`; an OS/gesture cancellation (incoming call, modal)
  leaves `panRef/pinchRef.active = true` frozen → transition permanently disabled until close.
- Fix: add `onTouchCancel` that mirrors the end-handler cleanup. Effort: S.

### A5. WARN — dark-mode.tsx: set-state-in-effect root + component-level FOUC window
- `src/lib/dark-mode.tsx:87-104` — `setThemeState(initial)` inside effect. `<html>` class flash is
  actually prevented (inline script VERIFIED at `src/app/layout.tsx:42-46`), but provider consumers
  render with default `light` context for the first pass (`:109-112`) → resolved-based styling can
  flash light-while-DOM-is-dark for one frame, and every page pays an extra render.
- Fix (subagent-validated): lazy `useState(() => getStoredTheme() ?? "light")` for `theme` +
  `resolved`; keep `setMounted` effect for hydration-gating only. Delete dead `getSystemPreference`
  (`:33-38`). Effort: S.
- Also: `setTheme` writes `localStorage` without try/catch (`:75`) — private-mode Safari throws.

### A6. WARN — Homepage data chain asymmetry (root cause of `/api/site` 500 ×4)
- Home page feeds only via client `SiteDataProvider` → `fetch("/api/site")` (`src/lib/site-data.tsx:27`)
  → Next rewrite → admin `:3001` (down in dev) → 500 in console, silently falling back.
- Gallery pages use the resilient server chain `getServerSiteData()` (`server-data.ts:21`,
  `gallery/page.tsx:22`, `gallery/[category]/page.tsx:17`). Homepage does NOT — checked: only
  gallery pages call it.
- Impact: visually OK today (hardcoded FALLBACK), and self-heals once `CATALYST_SITE_API_URL` is
  set. Residual: per-navigation client fetch + duplicated data paths + red console until deploy.
- Options: (a) leave (self-heals post-deploy) — recommend; (b) server-inject homepage data as
  provider initial state to kill the fetch entirely. Effort: S–M.

### A7. WARN — Memories nested interactive (audit block #2, still open)
- `src/components/home/Memories.tsx:33-68` — `<button>` (see/browse) contains a download `<a>` →
  invalid HTML + duplicated screen-reader names.
- Fix: card as plain div with separate link + button side-by-side. Effort: S.

### A8. WARN — Dead social placeholders (audit block #1, still open)
- `src/lib/data.ts:36-41` — Twitter/Facebook/Instagram `href="#"` (jump-to-top), YouTube
  `@YourChannel` — surfaced in header + footer (`Footer.tsx:26` renders `link.href` unconditionally).
- Fix: render social icon only when href is real; hide placeholders until URLs exist. Effort: S.

### A9. WARN — Service cards announce full description as accessible name
- `src/components/home/Services.tsx:33` — `role="button"` w/ long description text; add
  `aria-label={"Service: " + title}` (keep `aria-expanded`). Effort: XS.

### A10. WARN — admin app.js: localStorage retry can re-throw
- `admin/public/app.js:2249` — catch block calls `localStorage.setItem` (trimmed) unguarded; a
  genuinely full store throws again and skips `renderVersionPanel()`. Fix: inner try/catch or
  accept the loss. Effort: XS.

### A11. NOISE — unused/dead code (lint warnings; delete or optional-catch)
- `Lightbox.tsx:144` `getTouchMidpoint` (delete), `:282` unused `e` (drop param);
- `dark-mode.tsx:33` `getSystemPreference` (delete, see A5);
- `admin/public/app.js:2246,2264` unused `err` (optional catch binding), `:2604` unused `e` (drop).

### A12. WARN — trivial audit leftovers, one-liners
- `aria-current="true"` → `"page"`: `BottomNav.tsx:61`, `SiteHeader.tsx:176` (audit warn #12).
- Hero bg `alt="Hero background"` → `alt=""` (decorative, already inside `aria-hidden`): `Hero.tsx:29`.
- Copy: `"Balvikas Childrens"` → `"Children"` (`data.ts:45`); `"It is the level of each activities"`
  → concise rewrite (`Activities.tsx:65`); `"Co-ordinators"` → `"Coordinators"` (`Coordinators.tsx:23`).
- Contact phone hardcoded `tel:+919087951742` (`ContactSection.tsx:99`) vs CMS label → derive from
  `config.phone`. Effort: XS each.

## B. User/content-action items (we cannot do these)
- **B1.** Update stale `events` rows (July Ratha Mahotsavam) → current dates — Catalyst/console.
- **B2.** Provide real social URLs (Twitter/FB/IG/YouTube) → then A8 resolves.
- **B3.** Deploy `site-api` function + Console (anonymous invocation, mail sender domain) + set
  env vars (`CATALYST_SITE_API_URL`, `NEXT_PUBLIC_ASSET_BASE`, `ADMIN_TOKEN`) → resolves A6 + /api/site.
- **B4.** Upload `public/assets/*` to Stratus bucket, then delete from repo (asset() env flip).

## C. Resolved since the 2026-09-04 audit (verified)
- Purple drift (#6a5cff) — REMOVED (palette pass; decisions.md #8).
- Form status announced — `role="status" aria-live="polite"` (`ContactSection.tsx:203`).
- Header/footer emblem alts — proper ("Sri Sathya Sai Seva Organisations emblem", `SiteHeader.tsx:117,151`).
- Map iframe a11y — `title`, `loading="lazy"`, `referrerPolicy` (`ContactSection.tsx:118-125`).
- Dark-mode `<html>` flash — inline script present (`layout.tsx:42-46`).
- `/api/site` 500s — root-caused (A6); NOT a UI regression.

## D. Third-party noise (no action / low value)
- Google Maps `permissions-policy` warnings + streetview tile 404 — cross-origin iframe content;
  `loading="lazy"` already set; not suppressible reliably. NOISE.
- `eslint` react-hooks v6 errors in `Lightbox.tsx`/`dark-mode.tsx` — real but covered above (A1,A3,A5).

## Suggested sequencing
1. A1 + A5 + A11 (lightbox gesture fix, theme lazy-init, dead-code sweeps) — one small commit.
2. A2 + A3 + A4 (lightbox a11y/reset/cancel) — same file, same commit.
3. A7 + A8 + A9 + A12 (audit leftovers) — one commit.
4. A6 — decide (a) or (b) after Catalyst deploy; A10 — admin commit.
Then user actions B1–B4 to close the loop.