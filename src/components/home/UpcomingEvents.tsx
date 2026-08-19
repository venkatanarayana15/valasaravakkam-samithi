"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCoverflow, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import { upcomingEvents as staticEvents } from "@/lib/data";
import { useSiteData } from "@/lib/site-data";
import SectionTitle from "@/components/SectionTitle";
import Reveal from "@/components/Reveal";
import TiltCard from "@/components/TiltCard";
import Image from "next/image";

export default function UpcomingEvents() {
  const { upcomingEvents } = useSiteData();
  const events = upcomingEvents.length ? upcomingEvents : staticEvents;
  return (
    <section
      id="upcoming-events"
      className="py-16"
      style={{ backgroundColor: "#c4d1dbda" }}
    >
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <SectionTitle title="Upcoming Events" dark={false} />
        </Reveal>

        <Reveal delay={100}>
          <Swiper
            modules={[Autoplay, EffectCoverflow, Pagination]}
            speed={600}
            autoplay={{ delay: 2000, disableOnInteraction: false }}
            effect="coverflow"
            grabCursor
            centeredSlides
            slidesPerView="auto"
            coverflowEffect={{
              rotate: 30,
              stretch: 0,
              depth: 100,
              modifier: 1,
              slideShadows: true,
            }}
            pagination={{ clickable: true }}
            className="events-swiper !pb-16"
            breakpoints={{
              320: { slidesPerView: 1, spaceBetween: 40 },
              1200: { slidesPerView: 3, spaceBetween: 40 },
            }}
          >
            {events.map((event, i) => (
              <SwiperSlide key={i} className="!h-[375px] !w-full max-w-md">
                <TiltCard maxTilt={9} scale={1.04}>
                  <div className="shine relative h-[375px] w-full overflow-hidden rounded-xl shadow-xl">
                    <Image
                      src={event.image || "/assets/img/ratha-mahotsavam-bg.png"}
                      alt="Event background"
                      fill
                      sizes="(max-width: 1200px) 100vw, 33vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/35 via-black/55 to-black/75 p-6 text-center text-white">
                      <span className="tilt-pop mb-3 rounded-full bg-white/15 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur-sm">
                        {i === 0 ? "Save the Date" : `Day ${i}`}
                      </span>
                      <p className="tilt-pop font-display text-lg font-bold leading-relaxed drop-shadow">
                        {event.title}
                        {event.location && (
                          <>
                            <br />
                            <a
                              href={event.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-extrabold text-[#7dd3fc] underline-offset-2 hover:underline"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" className="inline size-4">
                                <path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7zm0 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                              </svg>
                              {event.location}
                            </a>
                          </>
                        )}
                      </p>
                      {event.description && (
                        <p className="tilt-pop mt-3 text-sm font-light italic leading-relaxed text-white/90">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TiltCard>
              </SwiperSlide>
            ))}
          </Swiper>
        </Reveal>
      </div>
    </section>
  );
}
