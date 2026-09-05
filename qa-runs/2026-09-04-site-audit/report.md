# Site Audit — 2026-09-04 (Standard tier, diagnostic pass)

**Scope:** homepage `/` — hero, stats, activities, events, memories, services,
coordinators, about, contact, footer, header/nav, chatbot widget.
**Evidence:** `desktop-hero.png`, `mobile-hero.png` (viewport captures),
full a11y-tree snapshot (in tool transcript), console errors (`/api/site` 500 ×4).

## Verdicts

### block — must fix
1. **Dead social links** — Twitter/Facebook/Instagram point to `"#"`, YouTube
   to `@YourChannel` (header + footer). Clicking jumps to top. Evidence: snapshot
   refs e1176–e1192. Fix: hide placeholder links until real URLs exist.
2. **Nested interactives in Memories** — "Download image" link nested inside
   `<button>`, button names duplicate text ("Balvikas Balvikas …"). Invalid
   HTML, broken screen-reader names. Evidence: refs e808–e851.
3. **Stale "Upcoming Events"** — Ratha Mahotsavam dates July 4–6 vs today
   Sept 4. Section advertises past events as upcoming. Needs current content
   (user/admin action) — see open questions.

### warn — should fix
4. **Hero has no CTA** — purely informational; pattern calls for Hero + CTA.
   Add primary + secondary actions.
5. **Purple drift `#6a5cff`** — header active-nav gradient, logo glow,
   BottomNav active gradient contradict decisions.md #4 (Sai blue only).
6. **Copy accuracy** — "Balvikas Childrens" → Children; "It is the level of
   each activities" → rewrite; "Co-ordinators"/"Coordinator" inconsistent.
7. **Contact phone link hardcoded** — `tel:+919087951742` in code while label
   comes from CMS data; future edits will desync them.
8. **Form status not announced** — sent/error messages need `aria-live`.
9. **Carousel dots have no role/label** — events (4) + coordinators (8) dots
   are bare generics. Add `role="tab"`/`aria-label` or real buttons.
10. **Service cards as giant buttons** — full description read as the
    accessible name. Shorten names, add `aria-expanded`.
11. **Alt text** — logo images `alt="Profile"`, hero bg `alt="Hero background"`.
12. **`aria-current="true"`** → `"page"` (header, bottom nav).
13. **`/api/site` 500s in console** — admin backend (:3001) absent; site falls
    back to static data correctly, but console is red and CMS edits never
    reach the render. Backend-scope; flagged, not fixed in UI pass.

### pass — verified good
- Mobile 375px: hero readable, header fits, bottom nav fits 6 items, no
  horizontal overflow. Desktop 1440px: layout clean, chatbot + scroll-top
  stacked correctly, dark toggle present.
- `prefers-reduced-motion` kill-switch present; alt/labels on form fields;
  map iframe titled + lazy; focus-visible rings defined.
- Chatbot widget renders and answers (verified earlier 9/9 smoke test).
