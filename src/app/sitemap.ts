import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { galleryCategories } from "@/lib/data";
import { KNOWN_SLUGS } from "@/lib/tenants";
export const dynamic = "force-static";

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
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
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
    // Multi-tenant samithi pages (extend KNOWN_SLUGS + rebuild on new samithi).
    {
      url: `${SITE_URL}/samithis`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...KNOWN_SLUGS.map((slug) => ({
      url: `${SITE_URL}/s/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.95,
    })),
    ...KNOWN_SLUGS.flatMap((slug) =>
      galleryCategories.map((c) => ({
        url: `${SITE_URL}/s/${slug}/gallery/${c.slug}`,
        lastModified: weekAgo(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ),
  ];
}
