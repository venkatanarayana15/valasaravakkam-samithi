"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { BsDownload, BsChevronLeft, BsChevronRight } from "react-icons/bs";
import type { GalleryImage } from "@/lib/data";

type LightboxProps = {
  images: GalleryImage[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export default function Lightbox({ images, index, onClose, onNavigate }: LightboxProps) {
  const [loaded, setLoaded] = useState(false);

  const close = useCallback(() => {
    setLoaded(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") onNavigate((index + 1) % images.length);
      if (e.key === "ArrowLeft") onNavigate((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, images.length, onNavigate, close]);

  if (index === null) return null;

  const image = images[index];

  return (
    <div className="lightbox-enter fixed inset-0 z-[100] flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-3 sm:p-4">
        <h3 className="text-lg font-semibold text-white">{image.title}</h3>
        <div className="flex items-center gap-2">
          <a
            href={image.src}
            download
            aria-label="Download image"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <BsDownload className="text-xl" />
          </a>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-6">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-2 sm:px-6">
        <button
          type="button"
          aria-label="Previous image"
          onClick={() => onNavigate((index - 1 + images.length) % images.length)}
          className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
        >
          <BsChevronLeft className="text-2xl" />
        </button>

        <div className="relative flex h-full w-full items-center justify-center">
          <Image
            key={image.src}
            src={image.src}
            alt={image.title}
            fill
            sizes="(max-width: 768px) 100vw, 80vw"
            priority
            onLoad={() => setLoaded(true)}
            className={`object-contain transition-opacity duration-300 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        <button
          type="button"
          aria-label="Next image"
          onClick={() => onNavigate((index + 1) % images.length)}
          className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
        >
          <BsChevronRight className="text-2xl" />
        </button>
      </div>

      <p className="p-4 text-center text-sm text-white/80">{image.description}</p>
    </div>
  );
}
