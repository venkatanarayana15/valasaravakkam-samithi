# Samithi on Catalyst — deploy guide

Backend for the Valasaravakkam Samithi site lives in the **samithi-app**
Catalyst project (`24184000000282001`, org `60054652908`).

Done already (via MCP, Development env): 14 Data Store tables seeded with
live site content + public `samithi-assets` Stratus bucket.

## 1. Deploy the function (one time, then on code changes)

```bash
npm i -g catalyst          # Catalyst CLI (you have zcatalyst-cli; either works)
catalyst login             # browser login, pick org 60054652908
cd catalyst                # this folder (catalyst.json lives here)
npm --prefix functions/site-api install
catalyst deploy --only functions:site-api
```

Copy the function URL from the output and **append `/execute`**:

```
https://samithi-app-XXXX.development.catalystserverless.com/server/site-api/execute
```

Set it for the website (Vercel → Environment Variables, and local `.env.local`):

```
CATALYST_SITE_API_URL=https://.../server/site-api/execute
```

The site tries Catalyst first and falls back to the old admin server, then to
built-in static data — safe to set at any time.

## 2. Endpoints

- `GET  {base}/site` → site JSON (same shape the admin `/api/site` serves)
- `POST {base}/contact` → `{name, email, subject, message, _honey?}` →
  stores in `contact_messages`, mails the samithi inbox, `201 {ok:true}`.
  Honeypot `_honey` filled → fake `201` (spam trap).

## 3. Console steps (required once)

1. **Security Rules** — Functions → site-api → allow anonymous invocation
   (the website calls it without a user token). Keep every other function
   restricted.
2. **Mail sender domain** — Mail → Sender Domains → add + verify DKIM/SPF.
   Until verified, contact mail is silently dropped (messages are still
   stored in `contact_messages` — nothing is lost).
3. **Events content** — Data Store → `events` → replace the stale July rows
   with current events. Fastest accuracy win on the site.
4. **Admin users** — Authentication → enable App Users, add coordinators.
   (The standalone `admin/server.mjs` currently uses an `ADMIN_TOKEN`
   shared secret — see below. Migrate it to App User tokens next.)
5. **Images** — Stratus → `samithi-assets` → upload `public/assets/*`
   (drag-drop in console; keys must be `assets/...`), then set
   `NEXT_PUBLIC_ASSET_BASE=https://samithi-assets-development.zohostratus.in`
   on the site and remove `public/assets` from the repo.

## 4. Admin server auth (already coded)

`admin/server.mjs` gates all non-GET `/api/*` routes (CRUD + uploads) behind
`Authorization: Bearer <ADMIN_TOKEN>`. Run it with:

```bash
ADMIN_TOKEN=<long-random-string> node server.mjs   # or: catalyst appsail deploy
```

The admin UI (`admin/public/app.js`) prompts for the token once and keeps it
in `sessionStorage`. GETs stay public (the website reads them).
