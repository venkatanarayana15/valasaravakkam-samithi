"use client";

import Image from "next/image";
import { FaOm } from "react-icons/fa6";
import { useSiteData } from "@/lib/site-data";

const particles = [
  { left: "8%", size: 6, delay: 0, duration: 11 },
  { left: "18%", size: 4, delay: 2.5, duration: 14 },
  { left: "30%", size: 5, delay: 5, duration: 12 },
  { left: "42%", size: 3, delay: 1.5, duration: 15 },
  { left: "55%", size: 6, delay: 4, duration: 13 },
  { left: "68%", size: 4, delay: 0.8, duration: 12 },
  { left: "80%", size: 5, delay: 3.2, duration: 14 },
  { left: "92%", size: 3, delay: 6, duration: 11 },
];

export default function Hero() {
  const { siteConfig } = useSiteData();
  return (
    <section
      id="hero"
      className="relative flex min-h-[92vh] items-center justify-center overflow-hidden"
    >
      {/* Parallax background */}
      <Image
        src="/assets/img/hero-bg.jpg"
        alt="Hero background"
        fill
        sizes="100vw"
        priority
        className="animate-kenburns object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/70" />

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {particles.map((p, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* 3D floating emblem */}
      <div
        className="absolute right-[7%] top-[16%] hidden md:block lg:right-[12%]"
        style={{ perspective: "900px" }}
        aria-hidden="true"
      >
        <div className="emblem h-44 w-44 lg:h-52 lg:w-52">
          <div className="emblem-ring r1" />
          <div className="emblem-ring r2" />
          <div className="emblem-ring r3" />
          <div className="emblem-core">
            <FaOm className="text-5xl drop-shadow-lg" />
          </div>
        </div>
      </div>

      {/* Hero content */}
      <div className="relative z-10 px-6 text-center text-white">
        <p
          className="hero-enter font-display text-base font-medium uppercase tracking-[0.35em] text-white/80 sm:text-lg"
          style={{ animationDelay: "0.1s" }}
        >
          Welcome to
        </p>
        <h1
          className="hero-enter text-gradient mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl"
          style={{ animationDelay: "0.3s" }}
        >
          {siteConfig.orgName}
        </h1>
        <h2
          className="hero-enter mt-3 text-xl font-semibold text-white sm:text-2xl"
          style={{ animationDelay: "0.5s" }}
        >
          {siteConfig.name}
        </h2>
        <p
          className="hero-enter mt-2 text-sm font-light tracking-wide text-white/70"
          style={{ animationDelay: "0.65s" }}
        >
          {siteConfig.zone}
        </p>
        <p
          className="hero-enter mx-auto mt-5 max-w-md text-sm italic text-white/60"
          style={{ animationDelay: "0.8s" }}
        >
          {siteConfig.tagline}
        </p>
      </div>
    </section>
  );
}
