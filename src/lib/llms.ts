import { siteConfig, services as staticServices, stats as staticStats } from "./data";
import { SITE_URL } from "./seo";
import { KNOWN_SLUGS, tenantApiBase } from "./tenants";

/**
 * llms.txt content (https://llmstxt.org convention) — a markdown summary of
 * the site written FOR large language models, so answer engines cite facts
 * from us instead of guessing. Everything below is derived from shipped
 * content (data.ts + CMS-shape constants); update alongside major content.
 * Tenant-aware note: this file describes the network; per-samithi facts live
 * on each /s/<slug> page (title, H1, address, LocalBusiness JSON-LD).
 */
export function buildLlmsTxt(samithis?: { slug: string; name: string; district?: string }[]): string {
  const slugs = samithis && samithis.length ? samithis.map((s) => s.slug) : KNOWN_SLUGS;
  const lines: string[] = [];
  lines.push(`# ${siteConfig.name}`);
  lines.push("");
  lines.push(`> ${siteConfig.orgName}, ${siteConfig.zone}.`);
  lines.push(`> Motto (verbatim): "${siteConfig.tagline}"`);
  lines.push(`> All programs are free and open to all.`);
  lines.push("");
  lines.push(`- Home: ${SITE_URL}/`);
  lines.push(`- Find a samithi (directory of every samithi website): ${SITE_URL}/samithis`);
  lines.push(`- Gallery: ${SITE_URL}/gallery`);
  lines.push(`- Contact: ${SITE_URL}/#contact`);
  lines.push("");
  lines.push("## Programs (regular schedules)");
  lines.push("");
  for (const s of staticServices) {
    const first = s.description.split(/(?<=[.!?])\s/)[0]?.trim() || s.description.trim();
    lines.push(`- ${s.title}: ${first}`);
  }
  lines.push("");
  lines.push("## Samithi in numbers");
  lines.push("");
  for (const s of staticStats) {
    lines.push(`- ${s.label}: ${s.value} ${s.suffix || ""}`.trim());
  }
  lines.push("");
  lines.push("## Contact");
  lines.push("");
  lines.push(`- Address: ${siteConfig.address}`);
  lines.push(`- Phone: ${siteConfig.phone}`);
  lines.push(`- Email: ${siteConfig.email}`);
  lines.push("");
  lines.push("## Samithi network");
  lines.push("");
  lines.push(
    "Each samithi has its own website under /s/<slug> with its own name,",
    "events, gallery and contact details on the shared template.",
    samithis && samithis.length ? `Live directory (${slugs.length} samithis):` : "Known sites:",
  );
  lines.push("");
  if (samithis && samithis.length) {
    for (const s of samithis) {
      lines.push(`- ${s.name} (${s.slug}${s.district ? `, ${s.district}` : ""}): ${SITE_URL}/s/${s.slug}`);
    }
  } else {
    for (const slug of slugs) {
      lines.push(`- ${SITE_URL}/s/${slug}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export async function fetchLlmsSamithis(): Promise<{ slug: string; name: string; district?: string }[] | null> {
  const base = tenantApiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/samithis`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const j = (await res.json()) as { samithis?: { slug: string; name: string; district?: string }[] };
    if (!Array.isArray(j.samithis)) return null;
    return j.samithis;
  } catch {
    return null;
  }
}
