import type { Metadata } from "next";
import { SiteDataProvider } from "@/lib/site-data";
import { TenantCategory } from "@/components/gallery/TenantGallery";
import { galleryCategories as staticCategories } from "@/lib/data";
import { KNOWN_SLUGS } from "@/lib/tenants";

type Props = {
  params: Promise<{ slug: string; category: string }>;
};

export function generateStaticParams() {
  const out: { slug: string; category: string }[] = [];
  for (const slug of KNOWN_SLUGS) {
    for (const c of staticCategories) out.push({ slug, category: c.slug });
  }
  return out;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, category } = await params;
  return {
    title: "Gallery",
    description: "Photo gallery — divine moments and seva snapshots.",
    alternates: { canonical: `/s/${slug}/gallery/${category}` },
  };
}

export default async function TenantCategoryPage({ params }: Props) {
  const { slug, category } = await params;
  const safe = slug.toLowerCase().trim().slice(0, 64) || "valasaravakkam";
  return (
    <div className="min-h-screen px-4 py-8 dark:bg-[#0f172a] sm:py-10 md:py-12" style={{ backgroundColor: "rgba(147, 156, 156, 0.25)" }}>
      <SiteDataProvider slug={safe}>
        <TenantCategory categorySlug={category} />
      </SiteDataProvider>
    </div>
  );
}
