"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import Image from "next/image";
import { BsQuote } from "react-icons/bs";
import { coordinators as staticCoordinators } from "@/lib/data";
import { useSiteData } from "@/lib/site-data";
import SectionTitle from "@/components/SectionTitle";
import Reveal from "@/components/Reveal";
import TiltCard from "@/components/TiltCard";

export default function Coordinators() {
  const { coordinators } = useSiteData();
  const list = coordinators.length ? coordinators : staticCoordinators;
  return (
    <section id="coordinators" className="bg-white py-10 sm:py-12 md:py-16 dark:bg-[#0f172a]">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <SectionTitle
            title="Co-ordinators"
            description="Valasaravakkam Samithi's most Valuable Co-ordinators and their responsibilities"
          />
        </Reveal>
        <Reveal delay={100}>
          <Swiper
            modules={[Autoplay, Pagination]}
            loop
            speed={600}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            grabCursor
            slidesPerView="auto"
            spaceBetween={1}
            pagination={{ clickable: true }}
            className="coordinators-swiper !pb-14"
            breakpoints={{
              320: { slidesPerView: 1, spaceBetween: 40 },
              1200: { slidesPerView: 3, spaceBetween: 1 },
            }}
          >
            {list.map((coordinator) => (
              <SwiperSlide key={`${coordinator.name}-${coordinator.role}`}>
                <TiltCard maxTilt={8} scale={1.03}>
                  <div className="shine mx-auto max-w-xl rounded-lg bg-[#f7f9fc] p-4 text-center shadow-sm transition hover:shadow-xl dark:bg-[#1e293b] sm:p-6">
                    <p className="relative text-sm italic leading-relaxed text-muted sm:text-[15px]">
                      <BsQuote className="absolute -left-2 -top-1 inline-block rotate-180 text-xl text-[#149ddd] opacity-60" />
                      <span className="px-4">{coordinator.description}</span>
                      <BsQuote className="absolute -right-2 -bottom-1 inline-block text-xl text-[#149ddd] opacity-60" />
                    </p>
                    <div className="tilt-pop mx-auto mt-5 inline-block">
                      <div className="relative">
                        <span className="animate-glow absolute inset-0 rounded-full" />
                        <Image
                          src={coordinator.image}
                          alt={coordinator.name}
                          width={84}
                          height={84}
                          className="relative h-[84px] w-[84px] rounded-full border-4 border-white object-cover shadow-md"
                        />
                      </div>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-[#272829] dark:text-gray-100">
                      {coordinator.name}
                    </h3>
                    <h4 className="text-sm font-medium text-[#149ddd] dark:text-blue-400">
                      {coordinator.role}
                    </h4>
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
