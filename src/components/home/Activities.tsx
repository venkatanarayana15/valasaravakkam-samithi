"use client";

import { useEffect, useRef, useState } from "react";
import { activityLevels as staticActivityLevels } from "@/lib/data";
import { useSiteData } from "@/lib/site-data";
import SectionTitle from "@/components/SectionTitle";
import Reveal from "@/components/Reveal";

function ProgressBar({ label, value, delay }: { label: string; value: number; delay: number }) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            setTimeout(() => setWidth(value), 80);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="mb-7">
      <div className="mb-2.5 flex items-center justify-between text-sm">
        <span className="font-display font-semibold uppercase tracking-wide text-[#272829] dark:text-gray-200">
          {label}
        </span>
        <span className="text-gradient-static text-sm font-bold">{value}%</span>
      </div>
      <div className="h-[11px] rounded-[50px] bg-[#e9ecef] shadow-inner dark:bg-gray-700">
        <div
          className="bar-shimmer h-full rounded-[50px] transition-[width] duration-1000 ease-out"
          style={{
            width: `${width}%`,
            transitionDelay: `${delay}ms`,
            background: "linear-gradient(90deg, #149ddd, #0d6efd)",
            boxShadow: "0 2px 8px rgba(13, 110, 253, 0.45)",
          }}
        />
      </div>
    </div>
  );
}

export default function Activities() {
  const { activityLevels } = useSiteData();
  const list = activityLevels.length ? activityLevels : staticActivityLevels;
  return (
    <section id="activities" className="bg-[#f7f9fc] py-12 sm:py-16 md:py-20 dark:bg-[#1e293b]">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <SectionTitle
            title="Activities Level"
            description="It is the level of each activities"
          />
        </Reveal>
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:gap-x-10 md:grid-cols-2">
          <Reveal delay={100}>
            {list.slice(0, 3).map((a, i) => (
              <ProgressBar key={a.name} label={a.name} value={a.value} delay={i * 120} />
            ))}
          </Reveal>
          <Reveal delay={200}>
            {list.slice(3).map((a, i) => (
              <ProgressBar key={a.name} label={a.name} value={a.value} delay={i * 120} />
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
