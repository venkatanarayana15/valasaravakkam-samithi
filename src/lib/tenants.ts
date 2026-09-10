/**
 * Multi-tenant helpers (nextplan.md D2/D4).
 *
 * Canonical tenant slugs known at build time. Slate static export
 * pre-renders one shell per slug here; unknown slugs are handled
 * client-side (branded not-found, no deploy needed). Extend this list
 * (or generate it from the `samithis` table at build time) and rebuild
 * whenever a samithi is created — content edits never need rebuilds.
 */
export const KNOWN_SLUGS = ['valasaravakkam'];

export const DEFAULT_SLUG = 'valasaravakkam';

const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const RESERVED_SLUGS = new Set([
  'www', 'app', 'admin', 'api', 'mail', 's',
  'security', 'gallery', 'thank-you', 'manifest', 'robots', 'sitemap', 'favicon',
]);

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !RESERVED_SLUGS.has(slug);
}

/** Absolute Catalyst function base, e.g. https://xxx/server/site-api/execute. Empty = same-origin /api (local dev). */
export function tenantApiBase(): string {
  return (process.env.NEXT_PUBLIC_FUNCTION_URL || '').replace(/\/$/, '');
}

export function tenantSiteUrl(slug: string): string {
  const base = tenantApiBase();
  const path = `/site?samithi=${encodeURIComponent(slug)}`;
  return base ? `${base}${path}` : `/api${path}`;
}

export function tenantContactUrl(slug: string): string {
  const base = tenantApiBase();
  const path = `/contact?samithi=${encodeURIComponent(slug)}`;
  return base ? `${base}${path}` : `/api${path}`;
}

/** Public path prefix for a tenant's pages. '' for the default (root) site. */
export function tenantBasePath(slug: string): string {
  return !slug || slug === DEFAULT_SLUG ? '' : `/s/${slug}`;
}
