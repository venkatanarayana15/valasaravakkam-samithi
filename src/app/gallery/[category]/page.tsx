import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { galleryCategories as staticCategories } from "@/lib/data";
import { getServerSiteData } from "@/lib/server-data";
import CategoryGallery from "@/components/gallery/CategoryGallery";

type Props = {
  params: Promise<{ category: string }>;
};

export function generateStaticParams() {
  return staticCategories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const { galleryCategories } = await getServerSiteData();
  const found = galleryCategories.find((c) => c.slug === category) ?? staticCategories.find((c) => c.slug === category);
  if (!found) return { title: "Gallery | Valasaravakkam Samithi" };
  return {
    title: `${found.label} Gallery | Valasaravakkam Samithi`,
    description: found.description,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const { galleryCategories } = await getServerSiteData();
  const found = galleryCategories.find((c) => c.slug === category) ?? staticCategories.find((c) => c.slug === category);
  if (!found) notFound();

  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: "rgba(147, 156, 156, 0.25)" }}>
      <div className="mx-auto max-w-7xl">
        <CategoryGallery category={found} />
      </div>
    </div>
  );
}
