"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BsDownload, BsZoomIn } from "react-icons/bs";
import { homeGalleryImages as staticImages } from "@/lib/data";
import { useSiteData } from "@/lib/site-data";
import SectionTitle from "@/components/SectionTitle";
import Reveal from "@/components/Reveal";
import Lightbox from "@/components/Lightbox";
import TiltCard from "@/components/TiltCard";

export default function Memories() {
  const { homeGalleryImages } = useSiteData();
  const images = homeGalleryImages.length ? homeGalleryImages : staticImages;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <section id="memories" className="bg-[#f7f9fc] py-10 sm:py-12 md:py-16 dark:bg-[#1e293b]">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <SectionTitle
            title="Memories"
            description="Explore divine moments and seva snapshots here. From soulful bhajans to heartfelt Narayana Seva, every photo reflects love in action. Relive festival celebrations, Balvikas events, and community outreach. Each image captures the spirit of Baba's message: 'Love All, Serve All.'"
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {images.map((image, i) => (
            <Reveal key={image.src} delay={i * 100}>
              <TiltCard maxTilt={9} scale={1.04}>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="shine group relative block w-full overflow-hidden rounded-xl shadow-md transition-shadow duration-300 hover:shadow-2xl hover:shadow-[#149ddd]/25"
                >
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={image.src}
                      alt={image.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-2.5 opacity-0 transition duration-300 group-hover:bg-black/40 group-hover:opacity-100">
                    <span className="tilt-pop self-start rounded bg-primary px-3 py-1 text-sm font-bold text-white dark:bg-blue-600">
                      {image.title}
                    </span>
                    <div className="flex items-end justify-between">
                      <span className="tilt-pop rounded bg-black/60 px-2.5 py-1.5 text-sm text-white">
                        {image.description}
                      </span>
                      <a
                        href={image.src}
                        download
                        aria-label="Download image"
                        onClick={(e) => e.stopPropagation()}
                        className="tilt-pop flex h-10 w-10 items-center justify-center rounded-full bg-primary/80 text-lg text-white transition hover:bg-primary"
                      >
                        <BsDownload />
                      </a>
                    </div>
                  </div>                    <span className="tilt-pop absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/80 text-white opacity-0 transition group-hover:opacity-100 dark:bg-blue-600/80">
                    <BsZoomIn />
                  </span>
                </button>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/gallery"
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
