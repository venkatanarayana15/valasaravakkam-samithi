# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/valasaravakkam-samithi/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
> Also read `design-system/decisions.md` — past rulings there are binding.

---

**Project:** Valasaravakkam Samithi
**Hand-tuned:** 2026-09-04 (replaces 2026-09-04 generator output — see decisions.md #1)
**Category:** Hindu devotional organisation (Sathya Sai Seva Organisation, Chennai Metro West)
**Stack:** Next.js 16 (app router) + React 19 + Tailwind CSS v4 + TypeScript

> Generator defaults (purple palette, Righteous font, "Church" category) were
> rejected — this file holds the code truth from `globals.css` + live components.

---

## Brand Voice

- Devotional, warm, humble. Greet with "Sai Ram".
- Motto (use verbatim): "Love All, Serve All. Help Ever, Hurt Never."
- Plain, respectful English. No slang, no hype, no emojis in UI copy.
- All programs are free and open to all — say so wherever joining is mentioned.

## Global Rules

### Color Palette (code truth — do not invent alternatives)

| Role | Hex | Token / Usage |
|------|-----|---------------|
| Primary | `#0d6efd` | `--color-primary` — links, selection, focus rings |
| Primary dark | `#0a58ca` | `--color-primary-dark` — primary hover |
| Accent / CTA | `#149ddd` | `--color-accent` — buttons, chatbot, scroll-top, highlights |
| Sidebar navy | `#040b14` | `--color-sidebar` — dark surfaces |
| Sidebar deep | `#02050a` | `--color-sidebar-deep` |
| Body text (light) | `#272829` | default text on white |
| Background (light) | `#ffffff` | page background |
| Muted text | `#5f6b7a` | secondary text (light mode minimum) |
| Dark bg | `#0f172a` | dark-mode page background (slate-900) |
| Dark text | `#e2e8f0` | dark-mode body text (slate-200) |
| Dark border | `rgba(148,163,184,0.15)` | dark-mode borders |
| Destructive | `#DC2626` | errors only |

Dark mode is class-based (`.dark` on `<html>`, persisted in `localStorage.theme`,
FOUC-guarded in `layout.tsx`). Every new surface MUST ship both modes.

### Typography (code truth)

- **Body:** Poppins (`--font-sans`, `--font-poppins`), system-ui fallback.
- **Display/headings:** Raleway (`--font-display`, `--font-raleway`).
- Loaded via `next/font/google` in `layout.tsx` — never add raw Google Fonts
  links or a third display font (Righteous and friends are banned).
- Base body 16px+. Generous line-height for elder devotees reading on phones.

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `2rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

### Platform Rules (from `globals.css` — non-negotiable)

- `overflow-x: clip` on html/body; body `overflow-x: hidden`. Never introduce
  horizontal scroll on mobile.
- `scroll-behavior: smooth` for anchor nav (`#hero`, `#contact`, …).
- 44px minimum touch targets on mobile (`a, button, [role="button"]`).
- iOS safe-area insets top/bottom on body.
- Visible `:focus-visible` ring (`--color-primary`, 2px, offset 2px).

---

## Component Specs

### Buttons

- Primary: `bg-[#149ddd] hover:bg-[#0f7eb5]` (light), `dark:bg-blue-600
  dark:hover:bg-blue-500`, white text, `rounded-full`, `cursor-pointer`,
  150–300ms `transition-colors`. Reference: `Chatbot.tsx`, `ScrollTop.tsx`.
- No gradients, no scale-on-hover, no layout-shifting hovers.

### Cards

- White / `dark:bg-slate-900`-family surfaces, `rounded-2xl`, slate borders
  (`border-slate-200` / `dark:border-slate-700`), `--shadow-md` → `--shadow-lg`
  on hover WITHOUT translate/scale.

### Floating Elements

- Fixed bottom-right stack order (mobile): BottomNav (~0–80px) → ScrollTop
  (`bottom-20`) → Chatbot launcher (`bottom-36`). New floating UI must join
  this stack, never overlap it. Desktop (`sm:`): ScrollTop `bottom-4`,
  launcher `bottom-24`.

### Inputs

- `rounded-full` or `rounded-2xl`, slate borders, 16px font (prevents iOS zoom),
  focus border `--color-accent`. Labels on all inputs.

---

## Style Guidelines

**Style:** Warm minimal devotional — clean light surfaces, Sai-blue accents,
generous whitespace, photography-led (real seva photos, never stock spiritual
clichés, never AI purple/pink gradients).

**Page pattern:** Hero + Darshan-info + Seva/Services + Gallery proof +
Events + Contact. Social proof via real gallery photos and member stats
(132 members, 56 Balvikas children), not testimonial carousels.

**Key effects:** Soft shadows, 150–300ms color transitions, smooth anchor
scrolling, gentle reveal on scroll. `prefers-reduced-motion` respected.
44x44px touch targets. Clear focus rings. Semantic HTML throughout.

---

## Anti-Patterns (Do NOT Use)

- ❌ Generator purple (`#7C3AED`), gold CTA, lavender backgrounds
- ❌ Third fonts (Righteous or any non-Poppins/Raleway display font)
- ❌ "Church" framing — this is a Hindu devotional organisation
- ❌ AI purple/pink gradients, stock spiritual clichés
- ❌ Emojis as icons — SVG only (react-icons / Heroicons / Lucide)
- ❌ Missing `cursor-pointer` on clickable elements
- ❌ Layout-shifting hovers (scale transforms)
- ❌ Text below 4.5:1 contrast; muted text lighter than `#5f6b7a` in light mode
- ❌ Instant state changes — always 150–300ms transitions
- ❌ Invisible focus states
- ❌ Content hidden behind fixed navbars / BottomNav
- ❌ Horizontal scroll on mobile

---

## Pre-Delivery Checklist

- [ ] Palette strictly from this file (no invented hexes)
- [ ] Poppins body + Raleway display only
- [ ] Both light AND dark mode verified with screenshots
- [ ] No emojis as icons; consistent icon set
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover/focus transitions 150–300ms, no layout shift
- [ ] Contrast 4.5:1 minimum; focus rings visible; keyboard nav works
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px — no horizontal scroll
- [ ] 44px touch targets on mobile; safe-area respected
- [ ] Floating elements join the bottom-right stack, no overlaps
- [ ] Brand voice: devotional, plain, "Sai Ram" where a greeting fits
