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
import DarkModeToggle from "@/components/DarkModeToggle";

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const renderSocial = (link: (typeof socialLinks)[number]) => {
    const common =
      "flex items-center justify-center rounded-full transition text-[#a8a9b4] hover:text-[#149ddd]";
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
        <span className="text-lg leading-none">
          {link.icon === "bi-twitter-x" && (
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          )}
          {link.icon === "bi-facebook" && (
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          {link.icon === "bi-instagram" && (
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          )}
        </span>
      </a>
    );
  };

  return (
    <>
      {/* Mobile top bar */}
      <header
        className={`fixed inset-x-0 top-0 z-40 bg-sidebar/95 backdrop-blur transition-shadow dark:bg-[#0a0f1a]/95 lg:hidden ${
          scrolled ? "shadow-lg shadow-black/30" : ""
        }`}
      >
        <div className="flex h-14 items-center justify-between px-3 sm:h-16 sm:px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/assets/img/my-profile-img.png"
              alt="Profile"
              width={36}
              height={36}
              className="rounded-full border-2 border-[#149ddd] object-cover"
            />
            <span
              className="font-display text-base font-semibold uppercase tracking-wide sm:text-lg"
              style={{
                background: "linear-gradient(90deg, #7dd3fc, #149ddd, #7dd3fc)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {siteConfig.name}
            </span>
          </Link>
          <DarkModeToggle />
        </div>
      </header>

      {/* Desktop top navbar */}
      <header
        className={`fixed inset-x-0 top-0 z-50 hidden bg-sidebar/95 backdrop-blur transition-all dark:bg-[#0a0f1a]/95 lg:block ${
          scrolled
            ? "shadow-xl shadow-black/40"
            : "border-b border-white/10"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <div
              className="animate-glow rounded-full p-[2px]"
              style={{ background: "linear-gradient(135deg, #149ddd, #6a5cff)" }}
            >
              <Image
                src="/assets/img/my-profile-img.png"
                alt="Profile"
                width={44}
                height={44}
                className="rounded-full border-2 border-sidebar object-cover"
              />
            </div>
            <span
              className="font-display text-xl font-bold uppercase tracking-wide"
              style={{
                background: "linear-gradient(90deg, #7dd3fc, #149ddd, #7dd3fc)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {siteConfig.name}
            </span>
          </Link>

          {/* Nav links */}
          <nav aria-label="Primary navigation">
            <ul className="flex items-center gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={active === link.href ? "true" : undefined}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                      active === link.href
                        ? "bg-gradient-to-r from-[#149ddd] to-[#6a5cff] text-white shadow-lg shadow-[#149ddd]/30"
                        : "text-[#c9cbdd] hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className={active === link.href ? "text-white" : "text-[#149ddd]"}>
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
            {socialLinks.map((link) => (
              <div key={link.label}>{renderSocial(link)}</div>
            ))}
            <a
              href={siteConfig.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="flex items-center justify-center rounded-full transition text-[#25d366] hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>
        </div>
      </header>
    </>
  );
}
