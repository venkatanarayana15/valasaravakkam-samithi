# Valasaravakkam Samithi — Website

Official website of the **Valasaravakkam Samithi** (Sri Sathya Sai Seva
Organisation, Chennai Metro West).

Next.js (App Router) + Tailwind CSS 4 front end, a standalone Node admin CMS
(`admin/`), and an optional Catalyst serverless backend (`catalyst/`).

## Quick start (local dev)

```bash
npm install
npm run dev          # site on :3000

cd admin && node server.mjs   # CMS API on :3001
```

Open http://localhost:3000. Without the admin server running, the site falls
back to built-in static content automatically.

## Production

```bash
npm run build && npm start
ADMIN_TOKEN=<long-random-string> node admin/server.mjs   # REQUIRED in prod
./start.sh                                               # or run both
```

Environment variables (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `ADMIN_TARGET` | Admin API base for rewrites (default `http://localhost:3001`) |
| `ADMIN_TOKEN` | Shared secret gating CMS mutations + private reads |
| `CATALYST_SITE_API_URL` | Catalyst function URL; when set, content is read from Catalyst |
| `NEXT_PUBLIC_ASSET_BASE` | Serve images from Stratus bucket instead of `/public` |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin used for SEO metadata/sitemap |

## SEO

- Metadata, Open Graph, Twitter cards and canonical URLs in `src/app/layout.tsx`
- JSON-LD structured data (Organization, LocalBusiness, Event, ImageGallery)
  rendered from live CMS data — see `src/lib/seo.ts`
- `src/app/sitemap.ts` and `src/app/robots.ts` emit `/sitemap.xml` and `/robots.txt`

## Security notes

- All CMS mutations and the `members`/`balvikas` personal-data collections are
  token-gated (`Authorization: Bearer <ADMIN_TOKEN>`). **Never run the admin
  server without `ADMIN_TOKEN` on a reachable network.**
- Uploads accept raster images only (SVG is rejected: scriptable format).
- JSON collection writes are atomic (temp file + rename).
- See `SECURITY.md` for the audit checklist.

## Deploy targets

- **Vercel / Node host** for the Next.js site (primary)
- **Catalyst** function `site-api` for the content API + contact pipeline —
  see `catalyst/README.md`

The old GitHub Pages static workflow was removed: it predates the Next.js
migration and would publish the repository source instead of a build.
