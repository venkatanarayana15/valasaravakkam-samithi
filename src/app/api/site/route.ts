import { NextResponse } from "next/server";
import { getServerSiteData, fetchRawSiteJson } from "@/lib/server-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const DEFAULT_SLUG = "valasaravakkam";

// Tenant-aware proxy: forwards ?samithi= to the backend untouched (status
// codes included) so unknown/suspended tenants surface correctly to the
// client instead of silently rendering default content.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = (url.searchParams.get("samithi") || DEFAULT_SLUG).toLowerCase().trim();
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "invalid samithi" }, { status: 400 });
    }
    const upstream = await fetchRawSiteJson(slug);
    if (upstream) {
      return NextResponse.json(upstream.json, {
        status: upstream.status,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    // No backend reachable: default tenant keeps the merged static fallback
    // (today's behavior); other tenants get 503 (client shows the notice —
    // safe direction, never another samithi's data).
    if (slug === DEFAULT_SLUG) {
      const data = await getServerSiteData();
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return NextResponse.json(
      { error: "backend unavailable" },
      { status: 503 },
    );
  } catch (err) {
    console.error("[api/site] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
