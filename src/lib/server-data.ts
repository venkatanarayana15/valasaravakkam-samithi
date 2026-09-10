import { mergeApi, FALLBACK, type SiteData } from "./data-shape";

const ADMIN_TARGET = process.env.ADMIN_TARGET || "http://localhost:3001";
// Catalyst function base, e.g. https://…/server/site-api/execute (no trailing slash).
// When set, the site reads live content from Catalyst Data Store first.
const CATALYST_API = (process.env.CATALYST_SITE_API_URL || "").replace(/\/$/, "");

// Re-fetch CMS content at most every 60s; when the backend is down we serve
// the last good copy instantly instead of stalling every request for the
// 3s timeout.
const REVALIDATE_SECONDS = 60;

async function fetchSiteJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function getServerSiteData(): Promise<SiteData> {
  if (CATALYST_API) {
    const data = await fetchSiteJson(`${CATALYST_API}/site`);
    if (data) return mergeApi(data);
  }
  const legacy = await fetchSiteJson(`${ADMIN_TARGET}/api/site`);
  if (legacy) return mergeApi(legacy);
  return FALLBACK;
}

/**
 * Raw tenant fetch for the /api/site route handler: tries Catalyst then the
 * legacy admin server with ?samithi=<slug>, returning backend status + JSON
 * untouched (the client merges). Null when no backend is reachable.
 */
export async function fetchRawSiteJson(
  slug: string,
): Promise<{ status: number; json: unknown } | null> {
  const q = `?samithi=${encodeURIComponent(slug)}`;
  if (CATALYST_API) {
    try {
      const res = await fetch(`${CATALYST_API}/site${q}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok || res.status === 404 || res.status === 403) {
        return { status: res.status, json: await res.json() };
      }
    } catch {
      // Fall through to legacy.
    }
  }
  try {
    const res = await fetch(`${ADMIN_TARGET}/api/site${q}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok || res.status === 404 || res.status === 403) {
      return { status: res.status, json: await res.json() };
    }
  } catch {
    return null;
  }
  return null;
}
