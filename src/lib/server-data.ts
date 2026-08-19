import { mergeApi, FALLBACK, type SiteData } from "./data-shape";

const ADMIN_TARGET = process.env.ADMIN_TARGET || "http://localhost:3001";

export async function getServerSiteData(): Promise<SiteData> {
  try {
    const res = await fetch(`${ADMIN_TARGET}/api/site`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return FALLBACK;
    return mergeApi((await res.json()) as Record<string, unknown>);
  } catch {
    return FALLBACK;
  }
}
