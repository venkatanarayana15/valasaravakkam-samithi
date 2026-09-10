"use client";

import { asset } from "@/lib/data";
import { useSiteData } from "@/lib/site-data";
import SectionTitle from "@/components/SectionTitle";
import Reveal from "@/components/Reveal";
import Image from "next/image";

const EMBLEM = asset("/assets/img/sssso-emblem-192.png");
const CENTENARY = asset("/assets/img/sathya-sai-100-years-logo.png");

/**
 * Upcoming Events — "Festival Chronicle" template.
 *
 * Deliberately different from the coordinator grid: the flagship festival gets
 * a full-width banner, and the remaining programmes read as a vertical
 * chronology with gold sequence markers (Day 1 / Day 2 / Day 3 genuinely are a
 * sequence, so numbered markers encode real information here).
 */
export default function UpcomingEvents() {
  const { upcomingEvents } = useSiteData();

  if (upcomingEvents.length === 0) return null;

  const [featured, ...chronology] = upcomingEvents;

  return (
    <section id="upcoming-events" className="bg-surface py-10 sm:py-12 md:py-16 dark:bg-[#101a2c]">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <SectionTitle title="Upcoming Events" description="Forthcoming celebrations and seva programmes — all are welcome." />
        </Reveal>

        {/* Flagship festival banner */}
        {featured && (
          <Reveal delay={60}>
            <article className="festival-banner shine relative overflow-hidden rounded-2xl text-[#10233f] shadow-lg dark:text-slate-100">
              {/* Layered royal-blue wash; content sits above */}
              <div className="festival-banner-bg" aria-hidden="true" />
              <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:gap-8 md:p-10">
                {/* Twin crests */}
                <div className="flex items-center gap-4 md:flex-col md:gap-2">
                  <Image
                    src={EMBLEM}
                    alt="Sri Sathya Sai Seva Organisations emblem"
                    width={64}
                    height={64}
                    className="h-14 w-14 shrink-0 object-contain drop-shadow sm:h-16 sm:w-16"
                  />
                  <Image
                    src={CENTENARY}
                    alt="Sri Sathya Sai Centenary Celebrations logo, 100 years"
                    width={64}
                    height={64}
                    className="h-14 w-14 shrink-0 object-contain drop-shadow sm:h-16 sm:w-16"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a6106] dark:text-[#fcd34d]">
                    {featured.date || "Save the Date"}
                  </p>
                  <h3 className="mt-2 font-display text-xl font-bold leading-snug sm:text-2xl md:text-[26px]">
                    {featured.title}
                  </h3>
                  {featured.description && (                      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#2b4a75] sm:text-[15px] dark:text-slate-300">
                      {featured.description}
                    </p>
                  )}
                </div>
              </div>
            </article>
          </Reveal>
        )}

        {/* Chronology of remaining programmes */}
        {chronology.length > 0 && (
          <ol className="chronology mt-8 space-y-4 sm:mt-10 sm:space-y-5">
            {chronology.map((event, i) => (
              <Reveal key={`${event.title}-${i}`} delay={100 + i * 60}>
                <li className="chronology-item relative pl-14 sm:pl-20">
                  {/* Gold sequence marker */}
                  <span
                    className="chronology-marker absolute left-0 top-5 flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-bold text-white shadow-md sm:h-11 sm:w-11 sm:text-base"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <article className="rounded-xl border border-border-strong bg-white p-4 shadow-sm transition-colors hover:border-[#d97706]/50 dark:bg-[#182338] sm:p-5">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h4 className="font-display text-base font-bold text-[#272829] dark:text-slate-100 sm:text-lg">
                        {event.title}
                      </h4>
                      {event.date && (
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#b45309] dark:text-[#fcd34d]">
                          {event.date}
                        </span>
                      )}
                    </div>
                    {event.location && (
                      <a
                        href={event.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-primary-dark underline-offset-2 hover:underline dark:text-[#7dd3fc]"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 shrink-0" aria-hidden="true">
                          <path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7zm0 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        </svg>
                        {event.location}
                      </a>
                    )}
                    {event.description && (
                      <p className="mt-2 text-sm leading-relaxed text-muted dark:text-slate-300">
                        {event.description}
                      </p>
                    )}
                  </article>
                </li>
              </Reveal>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
