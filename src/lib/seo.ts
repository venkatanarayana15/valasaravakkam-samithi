import { siteConfig, services as staticServices } from "./data";
import { DEFAULT_SLUG } from "./tenants";

/**
 * Canonical site origin. Single source of truth for metadataBase, sitemap,
 * robots and JSON-LD ids. Override per environment with NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.valasaravakkamsamithi.linkpc.net"
).replace(/\/$/, "");

/** Brand palette for Search Console / manifest / og-image consistency. */
export const BRAND = {
  primary: "#1e64d8",
  royal: "#3b93f7",
  sky: "#38bdf8",
  dark: "#0f172a",
};

export type JsonLdGraph = Record<string, unknown>[];

/** Tenant-specific organization identity for the /s/<slug> JSON-LD. */
export type TenantOrg = {
  id: string;
  url: string;
  name: string;
  alternateName?: string;
  description?: string;
  telephone?: string;
  email?: string;
  address?: string;
  sameAs?: string[];
};

/**
 * Derive a tenant's Organization/LocalBusiness identity from its own
 * DB-backed SiteData (record slug + siteconfig + social links), never the
 * homepage defaults. Missing fields fall back gracefully; an un-configured
 * tenant still never emits another samithi's name/phone/address.
 */
export function buildTenantOrg(data: {
  slug?: string;
  siteConfig?: Partial<typeof siteConfig>;
  socialLinks?: { href?: string }[];
}): TenantOrg {
  const slug = typeof data.slug === "string" && data.slug ? data.slug : DEFAULT_SLUG;
  const cfg = data.siteConfig || {};
  const fallbackName = prettyOrgName(slug);
  const name = cfg.name?.trim() ? cfg.name.trim() : `${fallbackName} Samithi`;
  const sameAs = (data.socialLinks || [])
    .map((l) => l?.href)
    .filter((href): href is string => !!href && /^https?:\/\//i.test(href) && href !== "#");
  return {
    id: `${SITE_URL}/s/${slug}#organization`,
    url: `${SITE_URL}/s/${slug}`,
    name,
    alternateName: cfg.orgName?.trim() || cfg.shortName?.trim() || undefined,
    description: `Sri Sathya Sai Seva Organisation – ${name}. Organization of the Sri Sathya Sai Seva Organisation with bhajans, Balvikas, seva and spiritual programs.`,
    telephone: cfg.phone?.trim() || undefined,
    email: cfg.email?.trim() || undefined,
    address: cfg.address?.trim() || undefined,
    sameAs,
  };
}

function prettyOrgName(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ")
    .trim();
}

/** Parse a free-text address ("17, … St, Chennai, Tamil Nadu 600087") into PostalAddress fields. Unknown parts are simply omitted. */
function toPostalAddress(raw: string | undefined): Record<string, string> {
  const fallback: Record<string, string> = { "@type": "PostalAddress", addressCountry: "IN" };
  if (!raw || typeof raw !== "string") return fallback;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return fallback;

  const out: Record<string, string> = { "@type": "PostalAddress", addressCountry: "IN" };
  const rest = [...parts];
  const pinMatch = rest[rest.length - 1].match(/\d{6}/);
  if (pinMatch) {
    out.postalCode = pinMatch[0];
    rest[rest.length - 1] = rest[rest.length - 1].replace(/\d{6}/, "").trim();
    if (!rest[rest.length - 1]) rest.pop();
  }
  const last = rest[rest.length - 1] || "";
  if (/tamil nadu|andhra pradesh|telangana|karnataka|kerala|maharashtra|gujarat|rajasthan|uttar pradesh|west bengal|delhi\b|haryana|punjab|bihar|odisha|assam|goa|jharkhand|chhattisgarh|madhya pradesh/i.test(last)) {
    out.addressRegion = rest.pop() || last;
  } else if (last) {
    out.addressLocality = rest.pop() || last;
  }
  if (rest.length) out.addressLocality = rest.pop() || "";
  if (rest.length) out.streetAddress = rest.join(", ");
  return out;
}

/**
 * JSON-LD @graph for the home page. Kept to types Google actively uses for
 * rich results: Organization (knowledge panel), LocalBusiness (local pack —
 * the Samithi has a fixed address and phone), and Event (for upcoming
 * programs). Rebuilding per render keeps CMS edits reflected in the markup.
 * Pass `tenant` (from `buildTenantOrg`) for /s/<slug> pages so each samithi
 * publishes its own identity; the root page omits it and uses siteConfig.
 */
export function buildHomeJsonLd(
  data: {
    upcomingEvents: { title: string; date?: string; description?: string; location?: string; mapsUrl?: string }[];
  },
  tenant?: TenantOrg,
): JsonLdGraph {
  const org = tenant ? {
    "@type": ["Organization", "LocalBusiness"],
    "@id": tenant.id,
    name: tenant.name,
    ...(tenant.alternateName ? { alternateName: tenant.alternateName } : {}),
    description: tenant.description,
    url: tenant.url,
    logo: `${SITE_URL}/assets/img/sssso-emblem-192.png`,
    image: `${SITE_URL}/assets/img/sathya-sai-100-years-logo.png`,
    ...(tenant.telephone ? { telephone: tenant.telephone } : {}),
    ...(tenant.email ? { email: tenant.email } : {}),
    address: toPostalAddress(tenant.address),
    sameAs: tenant.sameAs && tenant.sameAs.length ? tenant.sameAs : [siteConfig.youtube],
  } : {
    "@type": ["Organization", "LocalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    name: siteConfig.name,
    alternateName: siteConfig.shortName,
    description:
      "Sri Sathya Sai Seva Organisation – Valasaravakkam Samithi, Chennai Metro West. Weekly bhajans, Balvikas, Narayana Seva, Sai Protein, temple cleaning and study circle.",
    url: SITE_URL,
    logo: `${SITE_URL}/assets/img/sssso-emblem-192.png`,
    image: `${SITE_URL}/assets/img/sathya-sai-100-years-logo.png`,
    telephone: siteConfig.phone,
    email: siteConfig.email,
    address: toPostalAddress(siteConfig.address),
    sameAs: [
      "https://www.facebook.com/SSSSOCMW/",
      "https://www.instagram.com/sssso_tn/",
      siteConfig.youtube,
    ],
  };

  const orgId = tenant ? tenant.id : `${SITE_URL}/#organization`;
  const orgUrl = tenant ? tenant.url : SITE_URL;
  const events = data.upcomingEvents.slice(0, 8).map((e) => ({
    "@type": "Event",
    name: e.title,
    description: e.description || undefined,
    location: e.location
      ? {
          "@type": "Place",
          name: e.location,
          address: e.location,
        }
      : undefined,
    // Dates arrive as free text from the CMS ("Day 1", "July 4 (Fri …)").
    // Only emit a real date when parseable, else omit (never emit garbage).
    ...(e.date && !/^(day|save the date)/i.test(e.date)
      ? { startDate: parseLooseDate(e.date) }
      : {}),
    url: e.mapsUrl || `${orgUrl}/#upcoming-events`,
    image: `${SITE_URL}/assets/img/sathya-sai-100-years-logo.png`,
    organizer: { "@id": orgId },
  }));

  return [org, ...events];
}

function parseLooseDate(input: string): string | undefined {
  const cleaned = input.replace(/\(.*?\)/g, "").trim();
  const parsed = new Date(`${cleaned} ${new Date().getFullYear()}`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().split("T")[0];
}

/** JSON-LD for gallery pages (ImageGallery + breadcrumb). */
export function buildGalleryJsonLd(
  categories: { slug: string; label: string; description: string; images: unknown[] }[],
): JsonLdGraph {
  const crumbs = [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Gallery", item: `${SITE_URL}/gallery` },
  ];
  return [
    {
      "@type": "CollectionPage",
      "@id": `${SITE_URL}/gallery#page`,
      name: "Gallery | Valasaravakkam Samithi",
      url: `${SITE_URL}/gallery`,
      isPartOf: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/gallery#breadcrumb`,
      itemListElement: crumbs,
    },
    ...categories.map((c) => ({
      "@type": "ImageGallery",
      name: c.label,
      description: c.description,
      url: `${SITE_URL}/gallery/${c.slug}`,
      ...(Array.isArray(c.images) && c.images.length > 0
        ? { image: c.images.map((i) => (i as { src?: string }).src).filter(Boolean).slice(0, 12) }
        : {}),
    })),
  ];
}

/**
 * FAQPage JSON-LD for answer engines (Google rich results, voice assistants)
 * and generative-engine citations. Every Q&A is DERIVED from shipped content
 * (service descriptions, site config) — no invented facts. `orgName`
 * parameterises the tenant pages; defaults to Valasaravakkam.
 */
export function buildFaqJsonLd(
  orgName: string = siteConfig.name,
  contact?: { phone?: string; email?: string; address?: string; tagline?: string },
): JsonLdGraph {
  const firstSentence = (text: string): string => {
    const m = text.split(/(?<=[.!?])\s/)[0]?.trim();
    return m || text.trim();
  };
  const phone = contact?.phone || siteConfig.phone;
  const email = contact?.email || siteConfig.email;
  const address = contact?.address || siteConfig.address;
  const tagline = contact?.tagline || siteConfig.tagline;
  const questions: { name: string; text: string }[] = staticServices
    .slice(0, 5)
    .map((s) => ({
      name: `What is ${s.title} at ${orgName}?`,
      text: firstSentence(s.description),
    }));
  questions.push(
    {
      name: `How do I contact ${orgName}?`,
      text: `Phone ${phone}, email ${email}. Address: ${address}.`,
    },
    {
      name: `Is there any fee to join ${orgName} programs?`,
      text: `No. All programs are free and open to all. ${tagline}`,
    },
    {
      name: `What is the motto of ${orgName}?`,
      text: tagline,
    },
  );
  return [
    {
      "@type": "FAQPage",
      mainEntity: questions.slice(0, 8).map((q) => ({
        "@type": "Question",
        name: q.name,
        acceptedAnswer: { "@type": "Answer", text: q.text },
      })),
    },
  ];
}
