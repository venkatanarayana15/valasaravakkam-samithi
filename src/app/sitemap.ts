import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { galleryCategories } from "@/lib/data";
import { KNOWN_SLUGS, tenantApiBase } from "@/lib/tenants";
export const dynamic = "force-static";
export const revalidate = 3600;

async function liveSlugs(): Promise<string[]> {
  const base = tenantApiBase();
  if (!base) return KNOWN_SLUGS;
  try {
    const res = await fetch(`${base}/samithis`, { next: { revalidate: 3600 } });
    if (!res.ok) return KNOWN_SLUGS;
    const j = (await res.json()) as { samithis?: { slug: string }[] };
    if (!Array.isArray(j.samithis)) return KNOWN_SLUGS;
    const slugs = j.samithis.map((s) => s.slug).filter(Boolean);
    return slugs.length ? slugs : KNOWN_SLUGS;
  } catch {
    return KNOWN_SLUGS;
  }
}

// SEO note:
// - Home and gallery are the highest-value indexable surfaces.
// - Event-like CMS entries get a newer lastModified so search engines re-crawl
//   when bhajans / Ratha Mahotsavam dates change (no separate /events route exists,
//   so we just weight the home URL more heavily on event-heavy weeks).
function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}
function yearAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d;
}
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const slugs = await liveSlugs();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${SITE_URL}/gallery`,
      lastModified: weekAgo(),
      changeFrequency: "monthly" as const,
      priority: 0.85,
    },
    ...galleryCategories.map((c) => ({
      url: `${SITE_URL}/gallery/${c.slug}`,
      lastModified: weekAgo(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // Surface the organisation's most important entity pages explicitly so
    // Google knows they exist even before internal link equity builds up.
    {
      url: `${SITE_URL}#upcoming-events`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}#services`,
      lastModified: yearAgo(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}#about`,
      lastModified: yearAgo(),
      changeFrequency: "yearly" as const,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}#contact`,
      lastModified: yearAgo(),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/thank-you`,
      lastModified: yearAgo(),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/security`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    },
    // Multi-tenant samithi pages — live list when the function is reachable,
    // otherwise the built-in KNOWN_SLUGS (never empty, so crawlers always
    // have something to index).
    {
      url: `${SITE_URL}/samithis`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...slugs.map((slug) => ({
      url: `${SITE_URL}/s/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.95,
    })),
    ...slugs.flatMap((slug) =>
      galleryCategories.map((c) => ({
        url: `${SITE_URL}/s/${slug}/gallery/${c.slug}`,
        lastModified: weekAgo(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ),
    // llms.txt — the GEO entry point for answer engines; list it so the
    // sitemap advertises it alongside the HTML pages.
    {
      url: `${SITE_URL}/llms.txt`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    },
  ];
}
