"use client";

import Image from "next/image";
import { asset } from "@/lib/data";
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
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden sm:min-h-[80vh] md:min-h-[92vh]"
    >
      {/* Parallax background */}
      <Image
        src={asset("/assets/img/hero-bg.jpg")}
        alt=""
        fill
        sizes="100vw"
        priority
        className="animate-kenburns object-cover"
      />
      {/* Deepened vignette + subtle sky glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#123a80]/70 via-transparent to-[rgba(59,147,247,0.18)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/70" />
      {/* Soft sky glow on the left */}
      <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-[rgba(56,189,248,0.18)] to-transparent" />

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

      {/* Hero content */}
      <div className="relative z-10 px-6 text-center text-white">
        <p
          className="hero-enter font-display text-xs font-medium uppercase tracking-[0.28em] text-white/80 sm:text-base sm:tracking-[0.35em] md:text-lg"
          style={{ animationDelay: "0.1s" }}
        >
          Welcome to
        </p>
        <h1
          className="hero-enter text-gradient-hero mt-3 font-display text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl lg:text-5xl"
          style={{ animationDelay: "0.3s" }}
        >
          {siteConfig.orgName}
        </h1>
        <h2
          className="hero-enter mt-3 text-lg font-semibold text-white sm:text-xl md:text-2xl tracking-wide"
          style={{ animationDelay: "0.5s" }}
        >
          {siteConfig.name}
        </h2>
        <p
          className="hero-enter mt-2 text-xs font-light tracking-wide text-white/70 sm:text-sm"
          style={{ animationDelay: "0.65s" }}
        >
          {siteConfig.zone}
        </p>
        <p
          className="hero-enter mx-auto mt-5 max-w-md text-xs italic text-white/60 sm:text-sm"
          style={{ animationDelay: "0.8s" }}
        >
          {siteConfig.tagline}
        </p>          <div
            className="hero-enter mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "0.95s" }}
          >
            <a
              href="#upcoming-events"
              className="shine inline-flex min-h-[48px] items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white shadow-xl shadow-primary/30 transition-all duration-200 hover:bg-primary-dark hover:shadow-2xl hover:shadow-primary/40"
            >
              See Upcoming Events
            </a>
            <a
              href="#services"
              className="shine inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/40 bg-white/10 px-8 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:shadow-xl"
            >
              Join Saturday Bhajans
            </a>
          </div>
      </div>
    </section>
  );
}
