# Multi-Tenant Samithi SaaS — Build Plan (nextplan.md)

> Status: PLAN ONLY — approved scope for build mode. Do not implement until
> the owner replies "approve Phase 1".
> Date: 2026-09-05 | Stack: Next.js 16 (static export) + Catalyst Slate,
> Data Store, Functions, Stratus | Project: samithi-app (24184000000282001)

## 1. Vision
One template, every samithi. Each samithi under Sri Sathya Sai Seva
Organisation (SSSO) gets its own website link + independent content
(name, location, events, gallery, contact) + convenor login, all served
from a single codebase and a single Catalyst project — run as a free service.

## 2. Locked decisions
| # | Decision | Value |
|---|---|---|
| D1 | Hosting | Catalyst Slate (static). No domains bought — single Slate URL for all |
| D2 | URL model | Path-based: `<slate-url>/s/<slug>` (e.g. `/s/porur`). Subdomains impossible without DNS control |
| D3 | Root `/` | SSSO samithi directory ("find your samithi"); Valasaravakkam moves to `/s/valasaravakkam` with redirect |
| D4 | Tenancy | Shared DB + shared schema, `samithi_id` column per content row |
| D5 | Auth | Custom `convenors` table (bcrypt hash + function-issued sessions), owner-provisioned, invite-only login, no public signup. Catalyst App Users kept as fallback option only |
| D6 | Money | Free only, forever. No billing work |
| D7 | Template | Identical layout + fixed logos (SSSO emblem, centenary) + **5 preset themes** selectable per samithi in admin Theme section |
| D8 | Rebuild model | Content edits never rebuild (live function data). New slug = one rebuild+redeploy. Unknown slugs handled client-side |
| D9 | Old backend | `admin/server.mjs` + JSON files become local-dev only; shared `ADMIN_TOKEN` retired in Phase 2 |

## 3. Target architecture
```
Devotee:  <slate-url>/s/<slug>
  → Slate CDN serves pre-built shell (same template)
  → browser reads slug → GET <function>/site?samithi=<slug>
  → function validates slug → returns ONLY that samithi's rows
  → page renders name/events/gallery/map/contact + theme preset
Convenor: <slate-url>/admin  → login form → session → tenant-scoped editor
Owner:    owner console → create samithi → seed → invite convenor → link lives
```

## 4. Data model changes
**New table `samithis`:** `id, slug (unique, ^[a-z0-9-]+$, reserved: www/app/admin/api/mail/s/security/gallery/thank-you/manifest/robots/sitemap/favicon + all root routes), name, district, zone, address, inbox_email, phone, maps_embed, theme (default 'theme-1', enum theme-1..5), status (active/suspended), created_at`. **Slugs are immutable** — printed and shared links must never rot; names can change freely. On collision the wizard suggests alternatives (`porur-north`), never numeric suffixes.
**New table `audit_log`:** `id, actor_login, action, samithi_id, detail, created_at` — every owner/convenor mutation (create, invite, suspend, delete, publish) writes here; owner console reads it.
**Kept table `convenors` (owner decision — no App Users dependency):** `id, samithi_id, name, login (unique), password_hash (bcrypt), role ('owner'/'convenor'), active, created_at, last_login`. Sessions in a `sessions` table (`token_hash, convenor_id, expires_at`, 12h sliding expiry), issued and checked by the function; lockout + owner-forced reset built in Phase 2. **Bootstrap:** first owner created by CLI seed script, forced password reset on first login.
**Kept table `convenors` (owner decision — no App Users dependency):** `id, samithi_id, name, login (unique), password_hash (bcrypt), role ('owner'/'convenor'), active, created_at, last_login`. Sessions in a `sessions` table (`token_hash, convenor_id, expires_at`), issued and checked by the function; lockout + owner-forced reset built in Phase 2.
**`samithi_id` column** added to all 12 content tables: `siteconfig, social_links, stats, activities, events, services, coordinators, gallery_categories, gallery_images, home_gallery, about_sections, contact_messages`.
**Migration:** stamp all existing rows `samithi_id='valasaravakkam'`; insert its `samithis` row (theme-1, active). **Back up all 12 tables (export) before stamping** — data rollback = re-import, code rollback = redeploy previous function revision. Additive otherwise — old code keeps working until cutover.

## 5. Function changes (`catalyst/functions/site-api/index.js`, additive)
- `GET /site?samithi=<slug>` (param optional → defaults `valasaravakkam` = byte-identical today): validate → status check (unknown 404, suspended 403) → filter every read by `samithi_id` → response adds `samithi: {slug,name,district,theme,status}`.
- `GET /samithis` (new, public): active slugs + names + districts only — feeds `/` directory + sitemap. No content, no emails.
- `POST /contact?samithi=<slug>`: stores with `samithi_id`, mails that samithi's inbox (honeypot + validation unchanged).
- CORS: allow the Slate origin only (never `*`). Cache: `s-maxage=60`, keyed by full URL (slug in query = distinct entries).
- Contact mail uses the verified sender domain as From with the samithi inbox as Reply-To (per-samithi inboxes work without per-samithi domains).
- Isolation rule (corrected — no App User layer with custom auth): the function runs admin-scope and **is** the trust boundary. Every read filters by the validated slug; every mutation validates the session token, loads the convenor's `samithi_id`, and re-checks it against the target row. Tables are never reachable from browsers directly.
- Abuse hardening (Phase 5): rate-limit `POST /contact` + login attempts per IP (function-level throttle); honeypot stays.

## 6. Site changes (Next.js static export → Slate app #1)
- `generateStaticParams` per known slug + `/` directory page + client slug boot (read path → fetch live tenant JSON → merge).
- Per-samithi `<title>`/meta/H1/OG + tenant-aware `LocalBusiness` JSON-LD (extend `src/lib/seo.ts`); sitemap lists all slugs; canonicals per slug.
- Theme engine: `data-theme-preset` CSS variables, 5 presets × light/dark, each verified ≥4.5:1 body text (same contrast rig as current palette).
- All data calls → absolute function URL (`NEXT_PUBLIC_FUNCTION_URL`); `next.config` rewrites die with static export (dev-only thereafter).
- Sitemap + per-slug shells are generated **at build time from the live `samithis` table** (build needs Catalyst read access via env) — see §8 for the rebuild rule.
- Contact form posts to absolute function URL. Unknown slug → branded client-side not-found.
- Redirect limitation (static hosting has no server redirects): old section anchors (`/#events`) cannot 301. The directory page carries a prominent Valasaravakkam card instead; root URL itself stays live so shared links never die, they land one click away.

## 7. Admin changes (Slate app #2, from existing `admin/public` SPA)
- Login screen (convenor login + invite provisioning, sign-in only — no signup exists anywhere).
- Automatic tenant filter on all 11 collections + Site Settings + new **Theme section** (5 preset cards with mini-previews, one-click select → saves to the samithi row).
- Owner console (new): samithi list, convenor invites, onboarding wizard (create → seed → invite → link), suspend/unsuspend, "republish site" rebuild trigger, all-messages view across samithis, convenor offboarding (deactivate login, transfer samithi to a new login — content untouched).
- Suspend hides the site (403 + de-index via sitemap removal); delete is a separate, confirmed action taken only after export backup.
- "View Live Site" opens that convenor's own `/s/<slug>` URL. Media uploads flow admin → function → Stratus `samithi-assets/{slug}/` prefix (public bucket, no per-samithi buckets).
- All API calls absolute + authenticated (session carries `samithi_id`; every mutation re-checked server-side).

## 8. SEO plan (per earlier analysis)
- Prerendered HTML per slug with real content (build-time) + live client refresh.
- GBP per samithi (convenor launch checklist), district backlinks, directory anchor text, duplicate-content guard (required unique address/about/timings at onboarding, sparse seeds).
- Rebuild on new samithi (else no indexable page) + rebuild on major edits (else rankings lag); optional nightly rebuild.

## 9. Phase order (each leaves Valasaravakkam live)
1. **Backend tenancy** (§4–§5) + acceptance probes (byte-identical default, 404/403, cross-leak both directions, lint 0) + extend `tests/e2e` with tenant isolation cases.
2. **Auth** (custom convenor login/sessions/roles/lockout, retire `ADMIN_TOKEN`).
3. **Slate apps** (sites + admin deploys, directory, SEO wiring, absolute URLs).
4. **Admin as SaaS** (scoped editor, Theme section, owner console, onboarding).
5. **Launch ops** (rebuild flow, Stratus `{slug}/` prefixes, backups, audit log, suspend, Search Console, GBP guide, Dev→Production promotion — ZAID/envs differ, re-verify auth + URLs after promoting, cost watch at 10 samithis against free-tier quotas, convenor support channel e.g. shared WhatsApp group).

## 10. Operational requirements (owner)
- `catalyst login`; Slate already activated, zero apps (create 2 in Phase 3).
- Console clicks: CORS/authorized-domains for Slate origin, mail sender domain (already pending). No App User permission work needed (custom auth).
- Convenor onboarding: collect emails, issue invites, GBP/content guide per samithi.

## 11. Out of scope / carried punch list
Stale July seed events, duplicate Venkata Narayana entry, Twitter `#` link, empty members/balvikas lists, unreferenced root `sathya-sai-logo.jpg`, Tamil content fields (future), Catalyst deploy of current single-site (superseded by this plan — do not deploy old shape).
