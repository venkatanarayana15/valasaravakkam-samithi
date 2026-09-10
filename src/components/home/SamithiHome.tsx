"use client";

import Link from "next/link";
import Hero from "@/components/home/Hero";
import Stats from "@/components/home/Stats";
import Activities from "@/components/home/Activities";
import UpcomingEvents from "@/components/home/UpcomingEvents";
import Memories from "@/components/home/Memories";
import Services from "@/components/home/Services";
import Coordinators from "@/components/home/Coordinators";
import AboutSection from "@/components/home/AboutSection";
import ContactSection from "@/components/home/ContactSection";
import { useSiteData } from "@/lib/site-data";

/** Branded notice for unknown/suspended tenants — never another samithi's data. */
export function TenantNotFound() {
  const { slug, tenantError } = useSiteData();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-display text-lg font-bold uppercase tracking-wide text-[#272829] dark:text-gray-100">
        {tenantError === 'suspended' ? 'Samithi Unavailable' : 'Samithi Not Found'}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted dark:text-gray-400">
        {tenantError === 'suspended'
          ? `The "${slug}" samithi page is temporarily unavailable. Please contact the organisation for help. Sai Ram.`
          : `There is no samithi website at "${slug}" yet. Check the link or browse all samithis below. Sai Ram.`}
      </p>
      <Link
        href="/samithis"
        className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-dark"
      >
        Find Your Samithi
      </Link>
    </div>
  );
}

export function SamithiSections() {
  const { tenantError } = useSiteData();
  if (tenantError) return <TenantNotFound />;
  return (
    <>
      <Hero />
      <Stats />
      <Activities />
      <UpcomingEvents />
      <Memories />
      <Services />
      <Coordinators />
      <AboutSection />
      <ContactSection />
    </>
  );
}

/** Shared homepage composition — used by `/` and `/s/[slug]`. */
export default function SamithiHome() {
  return <SamithiSections />;
}
