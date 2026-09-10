"use client";

import Link from "next/link";
import { useSiteData } from "@/lib/site-data";
import SocialIcon from "@/components/SocialIcon";

export default function Footer() {
  const { siteConfig, socialLinks } = useSiteData();
  return (
    <footer className="border-t border-gray-200 bg-white py-4 dark:border-gray-700 dark:bg-[#0f172a] sm:py-6">
      <div className="px-4">
        <div className="mb-4 text-center text-sm text-[#272829] dark:text-gray-300">
          © <span>Copyright</span>{" "}
          <strong className="px-1 font-semibold">{siteConfig.shortName}</strong>{" "}
          <span>All Rights Reserved</span>
        </div>
        <div className="mb-4 text-center text-sm dark:text-gray-400">
          Designed & Distributed by{" "}
          <Link href="/" className="text-[#1a56bd] hover:underline dark:text-[#7dd3fc]">
            Valasaravakkam Samithi Youth
          </Link>
        </div>
        <div className="flex items-center justify-center gap-4 text-xl text-[#45505b] dark:text-gray-400">
          {/* Hide placeholder links (# / @YourChannel) until real URLs exist */}
          {socialLinks.filter((l) => l.href && l.href !== "#" && !l.href.startsWith("@")).map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              aria-label={link.label}
              className="transition hover:text-[#1e64d8] dark:hover:text-[#7dd3fc]"
            >
              <SocialIcon icon={link.icon} className="size-5" />
            </a>
          ))}
          <a
            href={siteConfig.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="text-[#158924] transition hover:text-[#1e64d8] dark:text-[#4ade80] dark:hover:text-[#7dd3fc]"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
