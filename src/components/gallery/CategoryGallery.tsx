"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BsDownload, BsZoomIn } from "react-icons/bs";
import { BsChevronLeft } from "react-icons/bs";
import type { GalleryCategory } from "@/lib/data";
import Lightbox from "@/components/Lightbox";
import TiltCard from "@/components/TiltCard";

export default function CategoryGallery({ category }: { category: GalleryCategory }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <Link
        href="/gallery"
        className="mb-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-bold text-white transition hover:bg-primary-dark"
      >
        <BsChevronLeft className="text-xl" />
        Back to gallery
      </Link>

      <div className="mb-10 text-center">
        <h1 className="text-gradient-static font-display text-3xl font-bold sm:text-4xl">
          {category.label} Gallery
        </h1>
        <div className="mx-auto mt-3 flex items-center justify-center gap-2">
          <span className="h-[2px] w-10 rounded-full bg-gradient-to-r from-transparent to-[#149ddd] sm:w-14" />
          <span className="divider-dot h-2 w-2 rounded-full bg-[#149ddd]" />
          <span className="h-[2px] w-10 rounded-full bg-gradient-to-l from-transparent to-[#149ddd] sm:w-14" />
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] text-muted">
          {category.description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
        {category.images.map((image, i) => (
          <TiltCard key={image.src} maxTilt={9} scale={1.04}>
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
                <span className="tilt-pop self-start rounded bg-primary px-3 py-1 text-sm font-bold text-white">
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
              </div>
              <span className="tilt-pop absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/80 text-white opacity-0 transition group-hover:opacity-100">
                <BsZoomIn />
              </span>
            </button>
          </TiltCard>
        ))}
      </div>

      <Lightbox
        images={category.images}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}
