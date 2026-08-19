"use client";

import { useEffect, useState } from "react";
import {
  BsHouse,
  BsFileEarmarkText,
  BsImages,
  BsHddStack,
  BsPerson,
  BsEnvelope,
} from "react-icons/bs";
import { useSiteData } from "@/lib/site-data";

const iconMap: Record<string, React.ReactNode> = {
  "bi-house": <BsHouse className="size-5" />,
  "bi-file-earmark-text": <BsFileEarmarkText className="size-5" />,
  "bi-images": <BsImages className="size-5" />,
  "bi-hdd-stack": <BsHddStack className="size-5" />,
  "bi-person": <BsPerson className="size-5" />,
  "bi-envelope": <BsEnvelope className="size-5" />,
};

const shortLabels: Record<string, string> = {
  "#upcoming-events": "Events",
};

export default function BottomNav() {
  const { navLinks } = useSiteData();
  const [active, setActive] = useState("#hero");

  useEffect(() => {
    const sections = navLinks.map((l) => l.href);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((href) => {
      const el = document.querySelector(href);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [navLinks]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="bottom-nav-enter mx-auto mb-3 w-[calc(100%-1.5rem)] max-w-md rounded-2xl border border-white/10 bg-[#040b14]/85 px-2 py-1.5 shadow-[0_-6px_30px_rgba(4,11,20,0.5)] backdrop-blur-xl">
        <ul className="flex items-center justify-between">
          {navLinks.map((link) => {
            const isActive = active === link.href;
            return (
              <li key={link.href} className="flex-1">
                <a
                  href={link.href}
                  aria-current={isActive ? "true" : undefined}
                  className="group flex flex-col items-center gap-0.5 py-1"
                >
                  <span
                    className={`flex size-9 items-center justify-center rounded-xl transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-br from-[#149ddd] to-[#6a5cff] text-white shadow-[0_4px_14px_rgba(20,157,221,0.6)] -translate-y-0.5 scale-105"
                        : "text-[#a8a9b4] group-active:scale-90"
                    }`}
                  >
                    {iconMap[link.icon]}
                  </span>
                  <span
                    className={`text-[10px] transition-colors ${
                      isActive
                        ? "font-semibold text-[#7dd3fc]"
                        : "text-[#a8a9b4]"
                    }`}
                  >
                    {shortLabels[link.href] ?? link.label}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
