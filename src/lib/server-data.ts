import { mergeApi, FALLBACK, type SiteData } from "./data-shape";

const ADMIN_TARGET = process.env.ADMIN_TARGET || "http://localhost:3001";
// Catalyst function base, e.g. https://…/server/site-api/execute (no trailing slash).
// When set, the site reads live content from Catalyst Data Store first.
const CATALYST_API = (process.env.CATALYST_SITE_API_URL || "").replace(/\/$/, "");

async function fetchSiteJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
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
