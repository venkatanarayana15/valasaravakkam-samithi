import type { Metadata } from "next";
import { SiteDataProvider } from "@/lib/site-data";
import SamithiHome from "@/components/home/SamithiHome";
import JsonLd from "@/components/JsonLd";
import { buildHomeJsonLd, buildFaqJsonLd, buildTenantOrg } from "@/lib/seo";
import { getServerSiteData } from "@/lib/server-data";
import { KNOWN_SLUGS, tenantApiBase, tenantSiteUrl } from "@/lib/tenants";
import { mergeApi, type SiteData } from "@/lib/data-shape";

type Props = {
  params: Promise<{ slug: string }>;
};

// Pre-rendered shells for known samithis (extend + rebuild on new samithi).
// Unknown slugs still render the shell; the client shows the branded
// not-found notice (no deploy needed, never another samithi's data).
export function generateStaticParams() {
  return KNOWN_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = `${prettyName(slug)} Samithi`;
  const description = `${title} — Sri Sathya Sai Seva Organisation. Love All, Serve All. Help Ever, Hurt Never.`;
  return {
    title,
    description,
    alternates: { canonical: `/s/${slug}` },
    openGraph: {
      title: `${title} | SSSO Samithi Network`,
      description,
      url: `/s/${slug}`,
      images: [
        {
          url: "/assets/img/sathya-sai-100-years-logo.png",
          width: 512,
          height: 512,
          alt: "Sri Sathya Sai Centenary Celebrations logo, 100 years",
        },
        {
          url: "/assets/img/sssso-emblem-512.png",
          width: 512,
          height: 512,
          alt: "Sri Sathya Sai Seva Organisations emblem",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | SSSO Samithi Network`,
      description,
      images: ["/assets/img/sathya-sai-100-years-logo.png"],
    },
    other: {
      speakable: JSON.stringify({
        "@type": "SpeakableSpecification",
        cssSelector: ["#hero", "#upcoming-events", "#services", "#contact"],
      }),
    },
  };
}

export default async function SamithiPage({ params }: Props) {
  const { slug: raw } = await params;
  // Pass through (trimmed): the API validates format (400) and existence
  // (404) / status (403); anything but a live tenant renders the branded
  // notice — never default content under a foreign URL.
  const safe = raw.toLowerCase().trim().slice(0, 64) || "valasaravakkam";

  // Best-effort server snapshot for JSON-LD/SEO (client refreshes live).
  // Only attempted when a function backend is configured — otherwise the
  // relative URL would hang the prerender with nothing listening.
  // Every /s/<slug> page derives its Organization/LocalBusiness identity
  // from its OWN DB record (via buildTenantOrg) — never the homepage's.
  let data: SiteData | null = null;
  let jsonLd = null;
  if (tenantApiBase()) {
    try {
      const res = await fetch(tenantSiteUrl(safe), {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        data = mergeApi(await res.json());
        jsonLd = buildHomeJsonLd(data, buildTenantOrg(data));
      }
    } catch {
      // Client boot covers data; SEO falls back to generic metadata above.
    }
  }
  if (!jsonLd) {
    try {
      data = await getServerSiteData();
      jsonLd = buildHomeJsonLd(data, buildTenantOrg(data));
    } catch {
      jsonLd = null;
    }
  }

  return (
    <SiteDataProvider slug={safe}>
      {jsonLd ? <JsonLd graph={jsonLd} id={`jsonld-${safe}`} /> : null}
      <JsonLd
        graph={buildFaqJsonLd(
          `${prettyName(safe)} Samithi`,
          data
            ? {
                phone: data.siteConfig?.phone,
                email: data.siteConfig?.email,
                address: data.siteConfig?.address,
                tagline: data.siteConfig?.tagline,
              }
            : undefined,
        )}
        id={`jsonld-faq-${safe}`}
      />
      <SamithiHome />
    </SiteDataProvider>
  );
}

function prettyName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
