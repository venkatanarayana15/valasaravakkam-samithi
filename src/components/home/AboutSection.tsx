"use client";

import Image from "next/image";
import { aboutSections as staticAboutSections, siteConfig as staticSiteConfig } from "@/lib/data";
import { useSiteData } from "@/lib/site-data";
import Reveal from "@/components/Reveal";
import TiltCard from "@/components/TiltCard";

export default function AboutSection() {
  const { aboutSections, siteConfig } = useSiteData();
  const sections = aboutSections.length ? aboutSections : staticAboutSections;
  const config = siteConfig ?? staticSiteConfig;
  return (
    <section id="about" className="relative overflow-hidden py-12 sm:py-16 md:py-20 dark:bg-[#0f172a]">
      <div className="absolute inset-0">
        <Image
          src="/assets/img/hero-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          className="animate-kenburns object-cover"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4">
        <Reveal>
          <TiltCard maxTilt={3} scale={1.01}>
            <div className="rounded-xl border border-black/5 bg-white/75 px-4 py-8 shadow-2xl backdrop-blur-md dark:border-gray-700 dark:bg-[#1e293b]/80 sm:px-6 sm:py-10 md:px-10">
              <h2 className="text-gradient mb-6 text-center font-display text-[26px] font-bold uppercase sm:text-[32px]">
                About
              </h2>              <div className="space-y-4 text-sm leading-relaxed text-[#111] dark:text-gray-300 sm:space-y-5 sm:text-[15px] md:text-base">
              <p>
                <em>
                  <strong>About Us</strong> – Valasaravakkam Samithi
                </em>{" "}
                The Sri Sathya Sai Seva Organisation is a spiritual, service-oriented
                organization inspired by the teachings of Bhagawan Sri Sathya Sai Baba,
                who emphasized the message: “Love All, Serve All. Help Ever, Hurt
                Never.” Valasaravakkam Samithi has been actively serving the community
                through seva (selfless service), spiritual activities, and educational
                programs that embody Swami&apos;s values of truth, righteousness, peace,
                love, and non-violence.
              </p>

              <hr className="border-t border-gray-400" />

              <div>
                <em>
                  <strong>Core Activities Of Samithi:</strong>
                </em>
                <ul className="mt-3 space-y-2">
                  {sections[0].items.map((item) => (
                    <li key={item.strong}>
                      <em>
                        <strong>{item.strong}</strong>
                      </em>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>

              <hr className="border-t border-gray-400" />

              <p>
                <em>
                  <strong>Our Mission:</strong>
                </em>{" "}
                To inspire individuals to live a righteous and purposeful life through
                selfless service and devotion, in alignment with Bhagawan&apos;s vision of
                “Transforming Self to Transform the World.”
              </p>
              <p>
                <em>
                  <strong>Join Us:</strong>
                </em>{" "}
                Everyone is welcome to be a part of this loving and spiritual journey.
                Whether through seva, devotion, or learning, Valasaravakkam Samithi
                offers opportunities for all to grow and serve together.
              </p>
              <p className="text-center font-medium text-[#149ddd]">
                {config.tagline}
              </p>
            </div>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}
