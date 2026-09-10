"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BsYoutube,
  BsHouse,
  BsFileEarmarkText,
  BsImages,
  BsHddStack,
  BsPerson,
  BsEnvelope,
} from "react-icons/bs";
import { useSiteData } from "@/lib/site-data";
import { asset } from "@/lib/data";
import DarkModeToggle from "@/components/DarkModeToggle";
import SocialIcon from "@/components/SocialIcon";

const iconMap: Record<string, React.ReactNode> = {
  "bi-house": <BsHouse className="size-4" />,
  "bi-file-earmark-text": <BsFileEarmarkText className="size-4" />,
  "bi-images": <BsImages className="size-4" />,
  "bi-hdd-stack": <BsHddStack className="size-4" />,
  "bi-person": <BsPerson className="size-4" />,
  "bi-envelope": <BsEnvelope className="size-4" />,
};

export default function SiteHeader() {
  const { siteConfig, socialLinks, navLinks } = useSiteData();
  const [active, setActive] = useState("#hero");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sections = navLinks.map((l) => l.href.replace(/^\/?#/, ""));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [navLinks]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide placeholder links (# or @YourChannel) until real URLs exist.
  const isRealSocial = (href: string) => href && href !== "#" && !href.startsWith("@");

  const renderSocial = (link: (typeof socialLinks)[number]) => {
    const common =
      "flex items-center justify-center rounded-full transition text-[#5f6b7a] hover:text-[#38bdf8] dark:text-[#a8a9b4]";
    if (!isRealSocial(link.href)) return null;
    if (link.label === "YouTube") {
      return (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          className={common}
        >
          <BsYoutube className="size-4" />
        </a>
      );
    }
    if (link.label === "WhatsApp") return null;
    return (
      <a
        key={link.label}
        href={link.href}
        target={link.href.startsWith("http") ? "_blank" : undefined}
        rel="noopener noreferrer"
        aria-label={link.label}
        className={common}
      >
        <SocialIcon icon={link.icon} className="size-4" />
      </a>
    );
  };

  return (
    <>
      {/* Mobile top bar */}
      <header
        className={`fixed inset-x-0 top-0 z-40 bg-white/95 backdrop-blur transition-shadow dark:bg-[#0a0f1a]/95 lg:hidden ${
          scrolled ? "shadow-lg shadow-black/20 dark:shadow-black/30" : "border-b border-slate-200 dark:border-transparent"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-3 sm:h-16 sm:px-4">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2">
            <Image
              src={asset("/assets/img/sssso-emblem-192.png")}
              alt="Sri Sathya Sai Seva Organisations emblem"
              width={36}
              height={36}
              className="shrink-0 object-contain drop-shadow"
            />
            <span className="text-gradient-static truncate font-display text-base font-semibold uppercase tracking-wide sm:text-lg">
              {siteConfig.name}
            </span>
          </Link>
          <DarkModeToggle />
        </div>
      </header>

      {/* Desktop top navbar */}
      <header
        className={`fixed inset-x-0 top-0 z-50 hidden bg-white/95 backdrop-blur transition-all dark:bg-[#0a0f1a]/95 lg:block ${
          scrolled
            ? "shadow-xl shadow-black/10 dark:shadow-black/40"
            : "border-b border-slate-200 dark:border-white/10"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-6 xl:gap-6">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <Image
              src={asset("/assets/img/sssso-emblem-192.png")}
              alt="Sri Sathya Sai Seva Organisations emblem"
              width={44}
              height={44}
              className="object-contain drop-shadow"
            />
            <span className="text-gradient-static font-display text-xl font-bold uppercase tracking-wide">
              {siteConfig.name}
            </span>
          </Link>

          {/* Nav links */}
          <nav aria-label="Primary navigation">
            <ul className="flex items-center gap-0.5 lg:gap-0.5 xl:gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={active === link.href.replace(/^\/?#/, "#") ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-full py-2 text-sm font-medium transition lg:px-3 2xl:px-4 ${
                      active === link.href.replace(/^\/?#/, "#")
                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                        : "text-[#475569] hover:bg-slate-900/5 hover:text-[#272829] dark:text-[#c9cbdd] dark:hover:bg-white/10 dark:hover:text-white"
                    }`}
                  >
                    <span aria-hidden="true" className={active === link.href ? "text-white" : "text-[#38bdf8]"}>
                      {iconMap[link.icon]}
                    </span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Social links */}
          <div className="flex shrink-0 items-center gap-2">
            <DarkModeToggle />
            <div className="hidden items-center gap-2 2xl:flex">
              {socialLinks.map((link) => (
                <div key={link.label}>{renderSocial(link)}</div>
              ))}
              <a
                href={siteConfig.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex items-center justify-center rounded-full transition text-[#158924] hover:text-[#1e64d8] dark:text-[#25d366] dark:hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
