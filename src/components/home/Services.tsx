"use client";

import { useState } from "react";
import {
  FaOm,
  FaDrum,
  FaUsers,
  FaUtensils,
  FaBookOpen,
  FaBagShopping,
} from "react-icons/fa6";
import { services as staticServices, type Service } from "@/lib/data";
import { useSiteData } from "@/lib/site-data";
import SectionTitle from "@/components/SectionTitle";
import Reveal from "@/components/Reveal";
import TiltCard from "@/components/TiltCard";

const iconMap: Record<string, React.ReactNode> = {
  "fa-om": <FaOm />,
  "fa-drum": <FaDrum />,
  "fa-users": <FaUsers />,
  "fa-utensils": <FaUtensils />,
  "fa-bag-shopping": <FaBagShopping />,
  "fa-book-open": <FaBookOpen />,
};

function ServiceCard({ service }: { service: Service }) {
  const [open, setOpen] = useState(false);

  return (
    <TiltCard maxTilt={8} scale={1.03}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        className={`shine group flex h-full cursor-pointer gap-3 rounded-xl p-4 transition duration-300 hover:shadow-2xl hover:shadow-black/10 sm:gap-4 sm:rounded-2xl sm:p-6 ${
          open ? "bg-white shadow-xl ring-1 ring-[#149ddd]/30 dark:bg-[#1e293b] dark:ring-blue-500/30" : "bg-white/60 dark:bg-[#1e293b]/60"
        }`}
      >
        {/* 3D animated icon tile */}
        <div className="tilt-pop shrink-0">
          <div
            className="animate-float-3d flex h-12 w-12 items-center justify-center rounded-xl text-xl text-white shadow-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl md:h-16 md:w-16"
            style={{
              background: "linear-gradient(135deg, #149ddd, #0d6efd)",
              boxShadow: "0 10px 24px -6px rgba(13, 110, 253, 0.5)",
            }}
          >
            {iconMap[service.icon]}
          </div>
        </div>

        <div className="flex-1">            <h4
              className="tilt-pop-2 text-lg font-semibold text-[#272829] dark:text-gray-100 transition-colors group-hover:text-[#149ddd]"
            style={{ display: "inline-block" }}
          >
            {service.title}
          </h4>
          <div
            className={`mt-2 overflow-hidden text-[15px] leading-relaxed text-muted transition-all duration-500 ${
              open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <p>{service.description}</p>
          </div>
          <span
            className={`mt-2 inline-block text-xs font-bold uppercase tracking-widest text-[#149ddd] dark:text-blue-400 transition ${
              open ? "opacity-100" : "opacity-0"
            }`}
          >
            Tap to collapse
          </span>
        </div>
      </div>
    </TiltCard>
  );
}

export default function Services() {
  const { services } = useSiteData();
  const list = services.length ? services : staticServices;
  return (
    <section id="services" className="py-12 sm:py-16 md:py-20 dark:bg-[#0f172a]">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <SectionTitle
            title="Services"
            description="At Sri Sathya Sai Seva Organisation – Valasaravakkam Samithi, we serve with love through spiritual activities, Narayana Seva, and community outreach. Guided by Baba's message of 'Love All, Serve All,' our initiatives uplift hearts, homes, and humanity."
          />
        </Reveal>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {list.map((service, i) => (
            <Reveal key={service.title} delay={i * 100}>
              <ServiceCard service={service} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
