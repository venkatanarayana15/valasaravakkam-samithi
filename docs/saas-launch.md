# Samithi SaaS — Launch & Operations Guide

Companion to `nextplan.md` (the architecture). This is the runbook: deploy,
operate, onboard, recover.

## 1. First deploy (one time, on your machine)

```bash
# Catalyst CLI login (browser opens — complete it, then continue)
catalyst login

# Deploy the multi-tenant function (code already tenant-ready in
# catalyst/functions/site-api — auth, tenancy, content CRUD, CORS, cache)
cd catalyst
npm --prefix functions/site-api install
catalyst deploy --only functions:site-api
```

Copy the function URL, append `/execute`. You need it for Slate env + admin.

```bash
# Static site for Slate (dev /api routes are stashed automatically)
NEXT_PUBLIC_FUNCTION_URL=https://<project>.catalystserverless.com/server/site-api/execute \
  npm run build:slate
# -> ./out/ : upload the whole folder to Slate app `samithi-sites`

# Admin SPA for Slate (same static files, other app)
# -> upload admin/public/ to Slate app `samithi-admin`
# (set the API base on its login card to the function URL above)
```

Create the two Slate apps first (console → Slate → Start Exploring if asked,
then `catalyst slate:create --name samithi-sites --framework nextjs -ni`
and the same for `samithi-admin`), then `catalyst deploy slate <name> -ni`.

## 2. Console steps (one time each)

1. **CORS / authorized domains** — allow the exact Slate origins
   (`https://<app>.onslate.com`) for function calls; or set the
   `ALLOWED_ORIGINS` function env var (comma-separated, no `*` ever).
2. **Mail sender domain** — Mail → Sender Domains → verify DKIM/SPF, or
   contact mails are silently dropped (messages are still stored).
3. **Promote to Production** before launch (Development ZAID/URLs differ).

## 3. Owner bootstrap (do this first, today)

A dev owner login already exists in Development: login **`owner`**.
Its temporary password was handed to you in chat — **sign in at the admin
and change it immediately** (Account → Change password). Then invite real
convenors from the Owner Console (each invite shows a one-time temporary
password — relay it over WhatsApp; it is never shown again).

## 4. Onboarding a samithi (2 minutes, repeatable)

1. Owner Console → create samithi (slug auto-checked, reserved words blocked).
2. Site is instantly live at `/s/<slug>` with seed content + default theme.
3. Invite convenor → relay login + temp password.
4. Convenor signs in → edits details/events/gallery/photos → Save All.
5. Convenor picks a theme (Site Settings → Theme) and claims the free
   Google Business Profile linking to their `/s/<slug>` page.
6. If the site needs fresh static HTML (new slug for SEO): run
   `npm run build:slate` and redeploy the Slate app (or use the
   "republish site" reminder — content edits themselves never need this).

## 5. Day-to-day ops

- **Suspend** a samithi (Owner Console → Suspend): site shows the
  unavailable notice, slug drops from directory/sitemap. Re-activate anytime.
- **Delete** only after exporting that samithi's rows (Data Store console).
- **Reset a convenor password**: Owner Console → Reset PW → relay the
  one-time password. **Disable** instead of deleting when someone leaves;
  transfer the samithi by inviting the successor.
- **Backups**: export Data Store tables before any bulk change (console);
  named backups also live in the admin Version History (browser storage).
- **Support channel**: one shared WhatsApp group with all convenors for
  "how do I…" questions; anything broken comes to you with a screenshot.
- **Monitoring**: watch function GB-seconds + Data Store rows at 10 samithis
  against free-tier quotas; audit log (`GET /audit`, owner) shows every
  privileged action.

## 6. Cutover checklist (single site → network)

- [ ] Function deployed + login probe passes (`POST /auth/login` → 200)
- [ ] Slate apps live, CORS set, contact form tested per samithi
- [ ] Valasaravakkam content reviewed (replace stale July events!)
- [ ] Duplicate coordinator entry resolved (Venkata Narayana ×2)
- [ ] Twitter `#` link replaced or entry removed
- [ ] Owner password changed from the temporary one
- [ ] Root `/` becomes the directory; Valasaravakkam moves to its link
- [ ] Search Console verified; GBP claimed for samithi #1
