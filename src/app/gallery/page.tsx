import type { Metadata } from "next";
import { getServerSiteData } from "@/lib/server-data";
import { GalleryFolderGrid } from "@/components/gallery/TenantGallery";
import JsonLd from "@/components/JsonLd";
import { buildGalleryJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photo gallery of Valasaravakkam Samithi — Balvikas classes, temple cleaning seva, bhajans and community outreach moments from the Sri Sathya Sai Seva Organisation, Chennai Metro West.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "Gallery | Valasaravakkam Samithi",
    description:
      "Divine moments and seva snapshots — Balvikas, temple cleaning, bhajans and community outreach.",
    url: "/gallery",
  },
};

export default async function GalleryPage() {
  const { galleryCategories } = await getServerSiteData();
  const categories = galleryCategories;
  return (
    <div className="min-h-screen px-4 py-12 dark:bg-[#0f172a] sm:py-16 md:py-20" style={{ backgroundColor: "rgba(147, 156, 156, 0.25)" }}>
      <JsonLd graph={buildGalleryJsonLd(categories)} id="jsonld-gallery" />
      <GalleryFolderGrid categories={categories} basePath="" />
    </div>
  );
}
