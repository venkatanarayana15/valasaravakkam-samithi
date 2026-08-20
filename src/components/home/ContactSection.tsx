"use client";

import { useState, type FormEvent } from "react";
import { BsGeoAlt, BsTelephone, BsEnvelope } from "react-icons/bs";
import { siteConfig as staticSiteConfig } from "@/lib/data";
import { useSiteData } from "@/lib/site-data";
import SectionTitle from "@/components/SectionTitle";
import Reveal from "@/components/Reveal";
import TiltCard from "@/components/TiltCard";

const FORMSUBMIT_URL = "https://formsubmit.co/8d83ef3758007b64d1254ddb0557f410";

export default function ContactSection() {
  const { siteConfig } = useSiteData();
  const config = siteConfig ?? staticSiteConfig;
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("sending");

    try {
      const formData = new FormData(form);
      const res = await fetch(FORMSUBMIT_URL, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });

      if (res.ok) {
        setStatus("sent");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <SectionTitle
            title="Contact"
            description="Whether you have questions, wish to join our seva activities, or simply seek spiritual guidance, feel free to reach out. Let's serve with love and grow on the path shown by Bhagawan Sri Sathya Sai Baba. Contact the Valasaravakkam Samithi today – Love All, Serve All."
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Info */}
          <div className="lg:col-span-5">
            <Reveal delay={100}>
              <TiltCard maxTilt={5} scale={1.01}>
                <div className="rounded-xl bg-[#f7f9fc] p-6 shadow-sm">
                <div className="group flex gap-4 rounded-xl p-2 transition duration-300 hover:bg-white hover:shadow-md">
                  <span className="animate-float-3d flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-xl text-[#149ddd] shadow transition group-hover:text-white group-hover:shadow-[#149ddd]/40" style={{ background: "linear-gradient(135deg,#fff,#f0f7ff)" }}>
                    <BsGeoAlt />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-[#272829]">Address</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {config.address}
                    </p>
                  </div>
                </div>

                <div className="group mt-6 flex gap-4 rounded-xl p-2 transition duration-300 hover:bg-white hover:shadow-md">
                  <span className="animate-float-3d flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-xl text-[#149ddd] shadow" style={{ animationDelay: "0.4s", background: "linear-gradient(135deg,#fff,#f0f7ff)" }}>
                    <BsTelephone />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-[#272829]">Call Us</h3>
                    <a href="tel:+919087951742" className="mt-1 block text-sm text-muted transition hover:text-[#149ddd]">
                      {config.phone}
                    </a>
                  </div>
                </div>

                <div className="group mt-6 flex gap-4 rounded-xl p-2 transition duration-300 hover:bg-white hover:shadow-md">
                  <span className="animate-float-3d flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-xl text-[#149ddd] shadow" style={{ animationDelay: "0.8s", background: "linear-gradient(135deg,#fff,#f0f7ff)" }}>
                    <BsEnvelope />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-[#272829]">Email Us</h3>
                    <a href={`mailto:${config.email}`} className="mt-1 block break-all text-sm text-muted transition hover:text-[#149ddd]">
                      {config.email}
                    </a>
                  </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-xl shadow-sm">
                  <iframe
                    src={config.mapsEmbed}
                    title="Samithi location map"
                    className="h-[270px] w-full border-0"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
              </TiltCard>
            </Reveal>
          </div>

          {/* Form */}
          <div className="lg:col-span-7">
            <Reveal delay={200}>
              <form
                onSubmit={handleSubmit}
                className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
              >
                <input type="hidden" name="_next" value="/thank-you" />
                <input type="hidden" name="_template" value="table" />
                <input type="hidden" name="_captcha" value="false" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="name-field" className="mb-2 block text-sm font-medium">
                      Your Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name-field"
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#149ddd] focus:ring-2 focus:ring-[#149ddd]/30"
                    />
                  </div>
                  <div>
                    <label htmlFor="email-field" className="mb-2 block text-sm font-medium">
                      Your Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email-field"
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#149ddd] focus:ring-2 focus:ring-[#149ddd]/30"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="subject-field" className="mb-2 block text-sm font-medium">
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      id="subject-field"
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#149ddd] focus:ring-2 focus:ring-[#149ddd]/30"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="message-field" className="mb-2 block text-sm font-medium">
                      Message
                    </label>
                    <textarea
                      name="message"
                      id="message-field"
                      rows={7}
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#149ddd] focus:ring-2 focus:ring-[#149ddd]/30"
                    />
                  </div>
                </div>

                <div className="mt-5 text-center">
                  {status === "sending" && (
                    <div className="mb-2 text-sm font-medium text-[#149ddd]">
                      Sending message...
                    </div>
                  )}
                  {status === "sent" && (
                    <div className="mb-2 rounded bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                      We appreciate your message — it will be very helpful to us. Thank you!
                    </div>
                  )}
                  {status === "error" && (
                    <div className="mb-2 rounded bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
                      Something went wrong while sending your message. Please try again.
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="rounded-md bg-primary px-8 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {status === "sending" ? "Sending..." : "Send Message"}
                  </button>
                </div>
              </form>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
