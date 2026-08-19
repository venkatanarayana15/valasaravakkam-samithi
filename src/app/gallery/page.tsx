import type { Metadata } from "next";
import Link from "next/link";
import { FaChildren, FaBroom, FaDrum, FaHandHoldingHeart } from "react-icons/fa6";
import { galleryCategories as staticCategories } from "@/lib/data";
import { getServerSiteData } from "@/lib/server-data";
import SectionTitle from "@/components/SectionTitle";
import TiltCard from "@/components/TiltCard";

export const metadata: Metadata = {
  title: "Gallery | Valasaravakkam Samithi",
  description: "Explore divine moments and seva snapshots from Valasaravakkam Samithi.",
};

const iconMap: Record<string, React.ReactNode> = {
  "fa-children": <FaChildren className="text-5xl" />,
  "fa-broom": <FaBroom className="text-5xl" />,
  "fa-drum": <FaDrum className="text-5xl" />,
  "fa-hand-holding-heart": <FaHandHoldingHeart className="text-5xl" />,
};

export default async function GalleryPage() {
  const { galleryCategories } = await getServerSiteData();
  const categories = galleryCategories.length ? galleryCategories : staticCategories;
  return (
    <div className="min-h-screen px-4 py-20" style={{ backgroundColor: "rgba(147, 156, 156, 0.25)" }}>
      <div className="mx-auto max-w-7xl">
        <SectionTitle title="Gallery Folders" />

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, i) => (
            <TiltCard key={category.slug} maxTilt={14} scale={1.05}>
              <Link
                href={`/gallery/${category.slug}`}
                className="shine group relative flex h-56 flex-col items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg transition duration-300 hover:shadow-2xl hover:shadow-[#149ddd]/25"
                style={{ perspective: "800px" }}
              >
                <span
                  className="animate-float-3d flex h-24 w-24 items-center justify-center rounded-3xl text-white shadow-lg transition duration-300 group-hover:scale-110"
                  style={{
                    animationDelay: `${i * 0.5}s`,
                    background: "linear-gradient(135deg, #149ddd, #0d6efd)",
                    boxShadow: "0 14px 30px -8px rgba(13, 110, 253, 0.5)",
                  }}
                >
                  {iconMap[category.icon]}
                </span>
                <h4 className="tilt-pop mt-5 text-lg font-semibold text-gray-800">
                  {category.label}
                </h4>
                <span className="mt-1 text-xs font-medium uppercase tracking-widest text-[#149ddd] opacity-0 transition duration-300 group-hover:opacity-100">
                  Explore
                </span>
              </Link>
            </TiltCard>
          ))}
        </div>
      </div>
    </div>
  );
}
