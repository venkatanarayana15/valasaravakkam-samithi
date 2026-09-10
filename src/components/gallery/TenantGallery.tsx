"use client";

import Link from "next/link";
import { FaChildren, FaBroom, FaDrum, FaHandHoldingHeart } from "react-icons/fa6";
import SectionTitle from "@/components/SectionTitle";
import TiltCard from "@/components/TiltCard";
import CategoryGallery from "@/components/gallery/CategoryGallery";
import { useSiteData } from "@/lib/site-data";
import { tenantBasePath } from "@/lib/tenants";
import type { GalleryCategory } from "@/lib/data";

const iconMap: Record<string, React.ReactNode> = {
  "fa-children": <FaChildren className="text-5xl" />,
  "fa-broom": <FaBroom className="text-5xl" />,
  "fa-drum": <FaDrum className="text-5xl" />,
  "fa-hand-holding-heart": <FaHandHoldingHeart className="text-5xl" />,
};

/** Folder cards shared by /gallery and /s/[slug]/gallery. */
export function GalleryFolderGrid({
  categories,
  basePath,
}: {
  categories: GalleryCategory[];
  basePath: string;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <SectionTitle title="Gallery Folders" level={1} />
      {categories.length === 0 ? (
        <p className="mx-auto max-w-xl text-center text-muted dark:text-gray-400">
          No gallery folders yet. Add categories with images in the admin panel.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8">
          {categories.map((category, i) => (
            <TiltCard key={category.slug} maxTilt={14} scale={1.05}>
              <Link
                href={`${basePath}/gallery/${category.slug}`}
                className="shine group relative flex h-48 flex-col items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg transition duration-300 hover:shadow-2xl hover:shadow-[#1e64d8]/25 dark:bg-[#1e293b] sm:h-56"
                style={{ perspective: "800px" }}
              >
                <span
                  className="animate-float-3d flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg transition duration-300 group-hover:scale-110 sm:h-20 sm:w-20 sm:rounded-3xl md:h-24 md:w-24"
                  style={{
                    animationDelay: `${i * 0.5}s`,
                    background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                    boxShadow: "0 14px 30px -8px color-mix(in srgb, var(--color-primary) 45%, transparent)",
                  }}
                >
                  {iconMap[category.icon]}
                </span>
                <h2 className="tilt-pop mt-5 text-lg font-semibold text-gray-800 dark:text-gray-200">
                  {category.label}
                </h2>
                <span className="mt-1 text-xs font-medium uppercase tracking-widest text-primary-dark opacity-0 transition duration-300 group-hover:opacity-100">
                  Explore
                </span>
              </Link>
            </TiltCard>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tenant gallery index: reads the tenant provider, links stay in-tenant. */
export function TenantGalleryIndex() {
  const { slug, galleryCategories, tenantError } = useSiteData();
  if (tenantError) return null;
  return <GalleryFolderGrid categories={galleryCategories} basePath={tenantBasePath(slug)} />;
}

/** Tenant category view: finds the folder or shows the empty message. */
export function TenantCategory({ categorySlug }: { categorySlug: string }) {
  const { slug, galleryCategories, tenantError } = useSiteData();
  if (tenantError) return null;
  const found = galleryCategories.find((c) => c.slug === categorySlug);
  if (!found) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="font-display text-lg font-bold text-[#272829] dark:text-gray-100">
          Gallery folder not found
        </p>
        <Link
          href={`${tenantBasePath(slug)}/gallery`}
          className="mt-4 inline-block text-sm font-bold text-primary-dark dark:text-[#7dd3fc]"
        >
          ← Back to gallery
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-7xl">
      <CategoryGallery category={found} />
    </div>
  );
}
