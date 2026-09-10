"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BsZoomIn } from "react-icons/bs";
import { useSiteData } from "@/lib/site-data";
import { tenantBasePath } from "@/lib/tenants";
import SectionTitle from "@/components/SectionTitle";
import Reveal from "@/components/Reveal";
import Lightbox from "@/components/Lightbox";
import TiltCard from "@/components/TiltCard";
import DownloadButton from "@/components/DownloadButton";

export default function Memories() {
  const { homeGalleryImages, slug } = useSiteData();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  if (homeGalleryImages.length === 0) return null;
  const images = homeGalleryImages;

  return (
    <section id="memories" className="bg-surface py-10 sm:py-12 md:py-16 dark:bg-[#1e293b]">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <SectionTitle
            title="Memories"
            description="Explore divine moments and seva snapshots here. From soulful bhajans to heartfelt Narayana Seva, every photo reflects love in action. Relive festival celebrations, Balvikas events, and community outreach. Each image captures the spirit of Baba's message: 'Love All, Serve All.'"
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {images.map((image, i) => (
            <Reveal key={`${image.src}-${i}`} delay={i * 100}>
              <TiltCard maxTilt={9} scale={1.04}>
                <div className="shine group relative block w-full overflow-hidden rounded-xl shadow-md transition-shadow duration-300 hover:shadow-2xl hover:shadow-[#1e64d8]/25">
                  <button
                    type="button"
                    aria-label={`View ${image.title} in lightbox`}
                    onClick={() => setLightboxIndex(i)}
                    className="relative block w-full cursor-pointer"
                  >
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={image.src}
                        alt={image.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-110"
                      />
                    </div>
                  </button>
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-black/0 p-2.5 opacity-0 transition duration-300 group-hover:bg-black/40 group-hover:opacity-100">
                    <span className="tilt-pop self-start rounded bg-primary px-3 py-1 text-sm font-bold text-white dark:bg-blue-600">
                      {image.title}
                    </span>
                    <div className="flex items-end justify-between">
                      <span className="tilt-pop rounded bg-black/60 px-2.5 py-1.5 text-sm text-white">
                        {image.description}
                      </span>
                      <DownloadButton
                        href={image.src}
                        label={`Download ${image.title}`}
                        className="tilt-pop pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/80 text-lg text-white transition hover:bg-primary"
                      />
                    </div>
                  </div>
                  <span
                    aria-hidden="true"
                    className="tilt-pop pointer-events-none absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/80 text-white opacity-0 transition group-hover:opacity-100 dark:bg-blue-600/80"
                  >
                    <BsZoomIn />
                  </span>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href={`${tenantBasePath(slug)}/gallery`}
            className="inline-block rounded-lg bg-primary px-6 py-2.5 font-bold text-white transition hover:bg-primary-dark"
          >
            View All Images
          </Link>
        </div>
      </div>

      <Lightbox
        images={images}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </section>
  );
}
