# Security Notes — Valasaravakkam Samithi

Last full audit: 2026-09-07 (senior security review pass + automated regression suite).
Reviewer role: senior cyber security analyser.
Scope: public informational site, contact form, chatbot, self-hosted admin CMS,
upload handling, and the security/privacy posture presented to visitors and
search engines.

## Threat model

Public informational site + unauthenticated contact form + a self-hosted CMS
served behind the site's `/admin` proxy. Assets are static images. The site is
a low-value, high-visibility target: the realistic threats are content defacement,
contact-form abuse, CMS credential leakage, and accidental information exposure
rather than sophisticated targeted attacks.

## Automated verification (the controls above are enforced by tests)

The security posture is regression-tested, not just documented. Run
`npm run test:all` (typecheck + lint + unit/integration + e2e).

### Unit & integration tests (`npm test`, vitest)

- `tests/admin-security.test.ts` — boots the REAL `admin/server.mjs` and probes
  the live HTTP surface: mutation auth gate (missing/wrong/case-mangled token),
  PII collections 401 without token, PII excluded from `/api/site`, malformed
  URL escapes → 400, invalid JSON → 400, SVG upload rejected, magic-byte
  mismatch rejected, path-traversal filenames contained, `/_ui` and `/uploads`
  traversal blocked, admin SPA hardening headers, sandboxing CSP +
  `Content-Disposition: attachment` on uploaded images.
- `tests/jsonld.test.ts` — JSON-LD serialization is XSS-safe: hostile
  `</script>` / `<!--` CMS payloads never appear as raw `<` in the emitted
  markup while parsing round-trips the data byte-identically.
- `tests/seo.test.ts` — JSON-LD builders emit valid schema shapes, never emit a
  garbage `startDate` for free-text CMS dates, cap Event nodes, filter blank
  image srcs.
- `tests/data.test.ts` — contact details well-formed, all external URLs https,
  no `javascript:`/`data:` hrefs anywhere in nav/social data, gallery slugs
  unique, asset paths encoded.
- `tests/chatbot.test.ts` — matcher canonicalization, injection-style queries
  fall back, weak/unknown input never fabricates answers, links only internal
  or https.

### E2E tests (`npm run test:e2e`, Playwright — production build, desktop + mobile Chromium)

- `security-headers.e2e.spec.ts` — the full header contract (HSTS, CSP,
  XFO, nosniff, COOP/COEP/CORP, Permissions-Policy, …) asserted on every page
  type **and** on API-proxy responses, from `tests/e2e/security-contract.ts`;
  no `X-Powered-By` fingerprint; CSP has no wildcard `script-src`.
- `seo.e2e.spec.ts` — JSON-LD emitted on pages is parseable and contains no raw
  `<` (breakout-safe); robots.txt keeps `/admin` + `/thank-you` out of the
  index; sitemap lists every gallery category; security.txt at both RFC 9116
  locations; manifest valid.
- `a11y.e2e.spec.ts` — zero console/page errors on every route, landmark
  structure, no image without alt, no focusable control without an accessible
  name.
- `contact-form.e2e.spec.ts` — HTML5 validation, honeypot attached + hidden,
  Catalyst-first → FormSubmit failover exercised (route hit-counters), error
  state announced via `role="status"`.
- `gallery.e2e.spec.ts` — lightbox keyboard map, focus moves into the dialog
  and returns to the invoking thumbnail on close.
- `chatbot.e2e.spec.ts`, `dark-mode.e2e.spec.ts`, `navigation.e2e.spec.ts`,
  `home.e2e.spec.ts` — UI behaviour incl. every external link https +
  `noopener noreferrer`.

Artifacts (traces, videos, HTML report) land in gitignored `qa-runs/`.

### Controls fixed during this audit

1. **Dead `next.config.ts`** — Next.js resolves `next.config.mjs` first, so the
   rewrites file was ignored: `/api/contact` and `/admin` proxies were never
   wired. Configs merged into `next.config.ts` (headers + rewrites), `.mjs`
   removed, `poweredByHeader: false` added.
2. **CSP blocked the contact-form fallback** — `connect-src` did not include
   `formsubmit.co`, so the FormSubmit failover could never fire in a real
   browser. Added (aligns with the already-reviewed `form-action` exception).
3. **COEP `require-corp` blocked the Google Maps embed**
   (ERR_BLOCKED_BY_RESPONSE). Switched to `credentialless` — same isolation,
   embeds load.
4. **Lightbox focus restore** — after arrow-key navigation, closing the dialog
   restored focus to a detached node (dropped to `<body>`). Invoker is now
   captured once per open, not per navigation.
5. **JSON-LD hardening** — `<`/`>`/U+2028/2029 now unicode-escaped so CMS text
   cannot break out of the JSON-LD script tag.

## Implemented controls

### Public site headers (`next.config.mjs`)
- **HSTS** — `max-age=31536000; includeSubDomains; preload`.
- **X-Frame-Options: DENY** — prevents clickjacking of the whole site.
- **X-Content-Type-Options: nosniff** — blocks MIME-type sniffing.
- **Referrer-Policy: strict-origin-when-cross-origin** — limits referrer leakage.
- **Permissions-Policy** — disables camera, microphone, geolocation, and
  Federated Learning of Cohorts (FLoC) at the browser level.
- **X-Permitted-Cross-Domain-Policies: none** — blocks cross-domain policy files.
- **COOP/COEP/CORP** — `same-origin` / `credentialless` / `same-origin` for
  process isolation. COEP `credentialless` (not `require-corp`) so the
  Google Maps and YouTube embeds are not blocked with ERR_BLOCKED_BY_RESPONSE.
- **Content-Security-Policy** — strict default-src `'self'`, with narrowly
  scoped allowances for Google Fonts, YouTube embeds, formsubmit.co, and
  Zoho/Catalyst calls (`connect-src` includes formsubmit.co so the contact
  form's fallback transport actually works). `object-src 'none'`,
  `base-uri 'self'`, `form-action 'self'` plus formsubmit, and
  `frame-ancestors 'none'`. Keep this policy as tight as possible; every
  `'unsafe-inline'` or external host is a reviewed exception, not a default.

### Admin API (`admin/server.mjs`)
- **Auth gate** — every non-GET `/api/*` request requires
  `Authorization: Bearer <ADMIN_TOKEN>`; comparison uses
  `crypto.timingSafeEqual` (no timing leak).
- **PII collections** — `members` and `balvikas` (names, phones, emails,
  parents) are excluded from the public `/api/site` aggregate and their GET
  routes require the token.
- **Crash-safe routing** — URL decoding happens inside the request `try`;
  malformed escapes (`/api/%zz`) return 400 instead of killing the process.
- **Atomic writes** — collection saves write a temp file + fsync + rename, so
  a crash cannot truncate a JSON datastore.
- **Path containment** — static/upload file serving uses
  `path.relative`-based containment (sibling directories like `uploads2`
  cannot be escaped into).
- **Upload hardening** — raster formats only; **SVG is rejected** (scriptable,
  same-origin XSS vector). Magic-byte sniffing must match the extension.
  Served with `X-Content-Type-Options: nosniff`, a sandboxing CSP and
  `Content-Disposition: attachment` (defense in depth).
- **Admin SPA headers** — `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy: no-referrer`.

### Site (`src/`)
- Contact form posts through `/api/contact` (Catalyst) with server-side
  validation, length caps, and a honeypot field; FormSubmit is a fallback.
- No `dangerouslySetInnerHTML` on user/CMS content (JSON-LD is
  `JSON.stringify`-escaped; React escapes everything else).
- External links use `rel="noopener noreferrer"`.
- Chatbot answers are Generated from CMS content only; no external API calls
  from the browser that could leak visitor data.

### Discoverability for researchers

- `/security.txt` and `/.well-known/security.txt` publish the preferred report
  contact and policy URL (RFC 9116).
- `/humans.txt` lists the people and stack behind the site for transparency.
- `/security` is a public page explaining data handling, controls, and how to
  report issues.
- `security.txt` is referenced from the root `security.txt` and from the site's
  public pages so crawlers and researchers can find it.

## SEO / discoverability hardening (non-security but reviewed together)

- Canonical home URL, `sitemap.xml`, and `robots.txt` are emitted by Next.js.
- `robots.txt` keeps `/admin`, `/_ui`, `/api/`, and `/thank-you` out of the index.
- JSON-LD on the home page uses Organization + LocalBusiness + Event types so
  Google can surface a knowledge panel, local pack, and event-rich results.
- Gallery pages emit ImageGallery + BreadcrumbList JSON-LD.
- Open Graph and Twitter Card metadata use `summary_large_image` with the site's
  existing logos; only images that actually exist are referenced.
- Speakable CSS selectors are declared for the main content sections.
- `geo.position`, `geo.region`, `geo.placename`, `ICBM`, `copyright`, and a few
  other non-standard but widely honoured meta tags are emitted for entity context.
- A richer keyword list covers the main service lines and locality.

## Known residual risks (accepted / documented)

1. **Contact form spam** — honeypot + server validation only; no CAPTCHA.
   Add one if volume becomes a problem.
2. **Admin token lifecycle** — single shared secret, no rotation UI, no
   rate limiting on `/api/*`. Behind a trusted network this is acceptable;
   for public internet exposure add rate limiting + per-user tokens
   (Catalyst App Users, see `catalyst/README.md` step 4).
3. **CORS** — the Catalyst function sends no CORS headers by design (server-
   side callers only). If browsers ever call it directly, configure
   Authorized Domains in the Catalyst console instead of manual headers.
4. **Local dev mode** — running without `ADMIN_TOKEN` leaves mutations open;
   the server prints a loud warning and `start.sh` echoes one too. Local-only.
5. **CSP exceptions** — the current CSP allows `'unsafe-inline'` for scripts and
   styles on the public site. This is practical for an app that already ships
   inline emoji SVGs and font/style usage from Google Fonts, but it is a known
  compromise. If you ever refactor to hashed scripts/styles or nonces, tighten
  this policy.
6. **OG/social images** — the site references only images that exist in
   `/public/assets/img`. If a logo is replaced and the referenced file is removed,
   the card degrades gracefully to text, but verify image existence after any
   asset ops.
7. **External embeds** — YouTube and Google Maps embeds are third-party
   content. They load in frames with the COEP/COOP policy above, but they still
   connect to third-party domains. If that matters for your audience, consider
   static fallbacks.

## Recommendations (priority order)

1. **Promote the admin behind auth always in production.** Never run the admin
   server or `start.sh` without `ADMIN_TOKEN` on any host that is reachable from
   the internet. Prefer a long random token injected via environment variable.
2. **Add rate limiting to the contact form and `/api/*` mutations** before public
   internet exposure. A simple per-IP window on the contact endpoint and per-token
   limits on admin mutations are the minimum.
3. **Consider CAPTCHA or a stricter spam filter** if contact-form spam increases.
4. **Use per-user admin tokens + audit logging** if more than one person edits
   content. The current single-token model makes attribution and revocation harder.
5. **Keep the CSP as tight as possible.** Review every new external host before it
   goes live, and remove `'unsafe-inline'` where practical.
6. **Validate assets after content updates.** Any change to logos, emblems, or
   gallery images should be checked against the metadata and JSON-LD that reference
   them.

## Reporting

Please contact the Samithi (see the site footer or `/security`) for security
issues; allow reasonable time for fixes before public disclosure. Sensitive reports
can be sent to the email in `/security.txt`; GPG-encrypted mail is welcome on request.
