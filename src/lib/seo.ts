import { siteConfig, services as staticServices } from "./data";

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

/**
 * JSON-LD @graph for the home page. Kept to types Google actively uses for
 * rich results: Organization (knowledge panel), LocalBusiness (local pack —
 * the Samithi has a fixed address and phone), and Event (for upcoming
 * programs). Rebuilding per render keeps CMS edits reflected in the markup.
 */
export function buildHomeJsonLd(data: {
  upcomingEvents: { title: string; date?: string; description?: string; location?: string; mapsUrl?: string }[];
}): JsonLdGraph {
  const org: Record<string, unknown> = {
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
    address: {
      "@type": "PostalAddress",
      streetAddress: "17, Chintamani Vinayagar Koil St, Alwartirunagar",
      addressLocality: "Chennai",
      addressRegion: "Tamil Nadu",
      postalCode: "600087",
      addressCountry: "IN",
    },
    sameAs: [
      "https://www.facebook.com/SSSSOCMW/",
      "https://www.instagram.com/sssso_tn/",
      siteConfig.youtube,
    ],
  };

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
    url: e.mapsUrl || `${SITE_URL}/#upcoming-events`,
    image: `${SITE_URL}/assets/img/sathya-sai-100-years-logo.png`,
    organizer: { "@id": `${SITE_URL}/#organization` },
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
export function buildFaqJsonLd(orgName: string = siteConfig.name): JsonLdGraph {
  const firstSentence = (text: string): string => {
    const m = text.split(/(?<=[.!?])\s/)[0]?.trim();
    return m || text.trim();
  };
  const questions: { name: string; text: string }[] = staticServices
    .slice(0, 5)
    .map((s) => ({
      name: `What is ${s.title} at ${orgName}?`,
      text: firstSentence(s.description),
    }));
  questions.push(
    {
      name: `How do I contact ${orgName}?`,
      text: `Phone ${siteConfig.phone}, email ${siteConfig.email}. Address: ${siteConfig.address}.`,
    },
    {
      name: `Is there any fee to join ${orgName} programs?`,
      text: `No. All programs are free and open to all. ${siteConfig.tagline}`,
    },
    {
      name: `What is the motto of ${orgName}?`,
      text: siteConfig.tagline,
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
