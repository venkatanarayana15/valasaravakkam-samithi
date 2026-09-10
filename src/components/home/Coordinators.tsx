"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSiteData } from "@/lib/site-data";
import SectionTitle from "@/components/SectionTitle";
import Reveal from "@/components/Reveal";

/**
 * Coordinators — "Seva Council" template.
 *
 * Deliberately a different template from the events chronology: the Convenor
 * is featured in a horizontal banner (the one role the whole samithi knows),
 * and every other coordinator stands in a temple-arch framed grid. The arch
 * motif comes from the subject's vernacular (temple silhouettes) instead of
 * another row of identical rounded cards.
 */
export default function Coordinators() {
  const { coordinators } = useSiteData();

  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (coordinators.length === 0) return null;

  // The Convenor leads the council; everyone else follows in the arch grid.
  const featuredIndex = coordinators.findIndex((c) => /convenor/i.test(c.role));
  const [convenor] =
    featuredIndex >= 0 ? coordinators.splice(featuredIndex, 1) : [];
  const council = coordinators;

  return (
    <section id="coordinators" className="bg-white py-10 sm:py-12 md:py-16 dark:bg-[#0f172a]">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <SectionTitle
            title="Coordinators"
            description="The seva council serving Valasaravakkam Samithi"
          />
        </Reveal>

        {/* Featured convenor — horizontal banner */}
        {convenor && (
          <Reveal delay={60}>
            <article className="council-featured mb-8 overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-sm sm:mb-10 dark:border-slate-700/60 dark:bg-[#15202e]">
              <div className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:gap-7 sm:p-8 sm:text-left">
                <div className={`convenor-frame shrink-0 ${reducedMotion ? "" : "animate-glow"}`}>
                  <Image
                    src={convenor.image}
                    alt={convenor.name}
                    width={112}
                    height={112}
                    className="h-24 w-24 rounded-full object-cover sm:h-28 sm:w-28"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b45309] dark:text-[#fcd34d]">
                    {convenor.role}
                  </p>
                  <h3 className="mt-1.5 font-display text-xl font-bold text-[#272829] dark:text-slate-100 sm:text-2xl">
                    {convenor.name}
                  </h3>
                  {convenor.description && (
                    <p className="mt-2.5 text-sm leading-relaxed text-muted dark:text-slate-300">
                      {convenor.description}
                    </p>
                  )}
                </div>
              </div>
            </article>
          </Reveal>
        )}

        {/* Temple-arch grid for the rest of the council */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 xl:grid-cols-3">
          {council.map((coordinator, i) => (
            <Reveal key={`${coordinator.name}-${coordinator.role}-${i}`} delay={80 + (i % 3) * 60}>
              <article className="arch-card group h-full text-center">
                <div className="arch-frame relative mx-auto h-40 w-32 sm:h-44 sm:w-36">
                  <Image
                    src={coordinator.image}
                    alt={coordinator.name}
                    fill
                    sizes="(max-width: 640px) 128px, 144px"
                    className="arch-img object-cover"
                  />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-[#272829] dark:text-slate-100 sm:text-lg">
                  {coordinator.name}
                </h3>
                <p className="mt-0.5 text-sm font-semibold text-primary-dark dark:text-[#7dd3fc]">
                  {coordinator.role}
                </p>
                {coordinator.description && (
                  <p className="mt-2.5 line-clamp-4 text-[13px] leading-relaxed text-muted dark:text-slate-400 sm:text-sm">
                    {coordinator.description}
                  </p>
                )}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
