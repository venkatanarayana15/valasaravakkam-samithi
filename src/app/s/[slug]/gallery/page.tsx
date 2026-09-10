import type { Metadata } from "next";
import { SiteDataProvider } from "@/lib/site-data";
import { TenantGalleryIndex } from "@/components/gallery/TenantGallery";
import { KNOWN_SLUGS } from "@/lib/tenants";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return KNOWN_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Gallery",
    description: "Photo gallery — divine moments and seva snapshots.",
    alternates: { canonical: `/s/${slug}/gallery` },
  };
}

export default async function TenantGalleryPage({ params }: Props) {
  const { slug } = await params;
  const safe = slug.toLowerCase().trim().slice(0, 64) || "valasaravakkam";
  return (
    <div className="min-h-screen px-4 py-12 dark:bg-[#0f172a] sm:py-16 md:py-20" style={{ backgroundColor: "rgba(147, 156, 156, 0.25)" }}>
      <SiteDataProvider slug={safe}>
        <TenantGalleryIndex />
      </SiteDataProvider>
    </div>
  );
}
