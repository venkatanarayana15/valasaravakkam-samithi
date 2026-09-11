import { describe, it, expect } from "vitest";
import { buildHomeJsonLd, buildGalleryJsonLd, buildTenantOrg, SITE_URL } from "@/lib/seo";

describe("SITE_URL", () => {
  it("has no trailing slash (safe to concatenate paths)", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  it("is an absolute https URL", () => {
    expect(SITE_URL.startsWith("https://")).toBe(true);
  });
});

describe("buildHomeJsonLd", () => {
  const base = { upcomingEvents: [] as { title: string; date?: string; description?: string; location?: string; mapsUrl?: string }[] };

  it("emits an Organization/LocalBusiness with contact details", () => {
    const graph = buildHomeJsonLd(base);
    const org = graph.find((n) => Array.isArray(n["@type"]) && (n["@type"] as string[]).includes("Organization"));
    expect(org).toBeDefined();
    expect(org!.telephone).toBeTruthy();
    expect(org!.email).toBeTruthy();
    expect((org!.address as { "@type": string })["@type"]).toBe("PostalAddress");
  });

  it("emits one Event node per upcoming event (capped at 8)", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ title: `Event ${i + 1}` }));
    const graph = buildHomeJsonLd({ upcomingEvents: many });
    const events = graph.filter((n) => n["@type"] === "Event");
    expect(events).toHaveLength(8);
  });

  it("never emits a garbage startDate for free-text CMS dates", () => {
    // Regression: "Day 1" / "Save the Date" used to be fed to new Date().
    const graph = buildHomeJsonLd({
      upcomingEvents: [
        { title: "Day 1", date: "Day 1" },
        { title: "Save the date", date: "Save the Date" },
        { title: "Valid", date: "July 4" },
      ],
    });
    const events = graph.filter((n) => n["@type"] === "Event");
    expect(events[0]).not.toHaveProperty("startDate");
    expect(events[1]).not.toHaveProperty("startDate");
    expect(events[2]).toHaveProperty("startDate", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("is XSS-safe: hostile CMS text cannot inject script through JSON-LD", () => {
    const graph = buildHomeJsonLd({
      upcomingEvents: [{ title: '</script><img src=x onerror=alert(1)>', location: "<script>alert(2)</script>" }],
    });
    // The serialized form must not contain a raw "<" (verified in jsonld.test.ts
    // via serializeJsonLd); here we assert the graph itself carries the raw
    // data so JSON.parse round-trips it exactly.
    const ev = graph.find((n) => n["@type"] === "Event") as { name: string };
    expect(ev.name).toContain("</script>");
  });
});

describe("buildTenantOrg", () => {
  it("derives identity from the tenant record, never the default samithi", () => {
    const org = buildTenantOrg({
      slug: "porur",
      siteConfig: { name: "Porur Samithi", phone: "+91 9876543210", email: "porur@gmail.com", address: "1, Main Rd, Porur, Chennai, Tamil Nadu 600116" },
      socialLinks: [
        { href: "https://www.facebook.com/porur/" },
        { href: "#" },
        { href: "" },
      ],
    });
    expect(org.id).toBe(`${SITE_URL}/s/porur#organization`);
    expect(org.name).toBe("Porur Samithi");
    expect(org.telephone).toBe("+91 9876543210");
    expect(org.email).toBe("porur@gmail.com");
    expect(org.sameAs).toEqual(["https://www.facebook.com/porur/"]);
  });

  it("falls back to the slug-derived name when a tenant is un-configured", () => {
    const org = buildTenantOrg({ slug: "adyar", siteConfig: {} });
    expect(org.name).toBe("Adyar Samithi");
    expect(org.telephone).toBeUndefined();
    expect(org.email).toBeUndefined();
  });
});

describe("buildHomeJsonLd(tenant)", () => {
  it("publishes the tenant's own contact/address in the LocalBusiness node", () => {
    const tenant = buildTenantOrg({
      slug: "porur",
      siteConfig: { name: "Porur Samithi", phone: "+91 9876543210", email: "porur@gmail.com", address: "1, Main Rd, Porur, Chennai, Tamil Nadu 600116" },
    });
    const graph = buildHomeJsonLd({ upcomingEvents: [] }, tenant);
    const org = graph.find((n) => Array.isArray(n["@type"]) && (n["@type"] as string[]).includes("Organization"));
    expect(org!["@id"]).toBe(`${SITE_URL}/s/porur#organization`);
    expect(org!.name).toBe("Porur Samithi");
    expect(org!.telephone).toBe("+91 9876543210");
    const addr = org!.address as { "@type": string; postalCode?: string; addressLocality?: string; streetAddress?: string };
    expect(addr["@type"]).toBe("PostalAddress");
    expect(addr.postalCode).toBe("600116");
    expect(addr.addressLocality).toBe("Chennai");
    expect(addr.streetAddress).toContain("Porur");
  });

  it("links Events to the tenant URL and identity", () => {
    const tenant = buildTenantOrg({ slug: "adyar", siteConfig: { name: "Adyar Samithi" } });
    const graph = buildHomeJsonLd({ upcomingEvents: [{ title: "Bhajans" }] }, tenant);
    const ev = graph.find((n) => n["@type"] === "Event") as { url: string; organizer: { "@id": string } };
    expect(ev.url).toContain("/s/adyar");
    expect(ev.organizer["@id"]).toBe(`${SITE_URL}/s/adyar#organization`);
  });
});

describe("buildGalleryJsonLd", () => {
  const categories = [
    {
      slug: "balvikas",
      label: "Balvikas",
      description: "Spiritual education for children",
      images: [{ src: `${SITE_URL}/a.jpg` }, { src: "" }, { src: `${SITE_URL}/b.jpg` }],
    },
    { slug: "other", label: "Other", description: "Outreach", images: [] },
  ];

  it("emits a CollectionPage and BreadcrumbList", () => {
    const graph = buildGalleryJsonLd(categories);
    expect(graph.some((n) => n["@type"] === "CollectionPage")).toBe(true);
    expect(graph.some((n) => n["@type"] === "BreadcrumbList")).toBe(true);
  });

  it("emits one ImageGallery per category, filtering blank image srcs", () => {
    const graph = buildGalleryJsonLd(categories);
    const galleries = graph.filter((n) => n["@type"] === "ImageGallery");
    expect(galleries).toHaveLength(2);
    expect(galleries[0].image).toEqual([`${SITE_URL}/a.jpg`, `${SITE_URL}/b.jpg`]);
    expect(galleries[1]).not.toHaveProperty("image");
  });
});
