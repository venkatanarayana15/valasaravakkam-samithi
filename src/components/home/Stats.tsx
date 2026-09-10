"use client";

import { useEffect, useRef, useState } from "react";
import {
  BsEmojiSmile,
  BsJournalRichtext,
  BsHouse,
  BsPeople,
} from "react-icons/bs";
import { useSiteData } from "@/lib/site-data";
import Reveal from "@/components/Reveal";

const iconMap: Record<string, React.ReactNode> = {
  "bi-emoji-smile": <BsEmojiSmile className="size-7" />,
  "bi-journal-richtext": <BsJournalRichtext className="size-7" />,
  "bi-house": <BsHouse className="size-7" />,
  "bi-people": <BsPeople className="size-7" />,
};

function CountUp({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const duration = 1100;
            const start = performance.now();
            const tick = (now: number) => {
              const progress = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(Math.floor(eased * target));
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="text-gradient-static font-display text-3xl font-extrabold sm:text-4xl md:text-5xl">
      {value}
    </span>
  );
}

export default function Stats() {
  const { stats } = useSiteData();
  if (stats.length === 0) return null;
  const list = stats;
  return (          <section id="stats" className="py-12 sm:py-16 md:py-20 dark:bg-[#0b1120]">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:grid-cols-4">
          {list.map((stat, i) => (
            <Reveal key={`${stat.label}-${i}`} delay={i * 100}>
              <div
                className="group relative flex flex-col items-center text-center"
                style={{ perspective: "800px" }}
              >
                {/* 3D floating icon */}
                <div
                  className="animate-float-3d relative flex h-14 w-14 items-center justify-center rounded-xl text-white shadow-lg transition duration-300 group-hover:scale-110 sm:h-16 sm:w-16 sm:rounded-2xl md:h-20 md:w-20"
                  style={{
                    animationDelay: `${i * 0.6}s`,
                    background:
                      "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
                    boxShadow: "0 12px 30px -8px color-mix(in srgb, var(--color-primary) 55%, transparent)",
                  }}
                >
                  {iconMap[stat.icon]}
                  <span className="absolute -inset-2.5 -z-10 rounded-3xl bg-[#38bdf8]/15 blur-md" />
                </div>

                <CountUp target={stat.value} />
                <p className="mt-2 text-[15px] text-[#475569] dark:text-gray-400">
                  <strong className="font-semibold text-[#1f2937] dark:text-gray-200">{stat.label}</strong>{" "}
                  <span>{stat.suffix}</span>
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
