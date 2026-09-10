import { describe, it, expect } from "vitest";
import { mergeApi, emptyTenant, asTheme, FALLBACK } from "@/lib/data-shape";
import { isValidSlug, tenantBasePath, tenantSiteUrl } from "@/lib/tenants";

describe("multi-tenant site data", () => {
  it("defaults slug/theme on the fallback payload", () => {
    expect(FALLBACK.slug).toBe("valasaravakkam");
    expect(FALLBACK.theme).toBe("theme-1");
    expect(FALLBACK.tenantError).toBeNull();
  });

  it("reads tenant identity from the samithi block", () => {
    const merged = mergeApi({ samithi: { slug: "porur", theme: "theme-3" } });
    expect(merged.slug).toBe("porur");
    expect(merged.theme).toBe("theme-3");
  });

  it("rejects bogus theme values (injection-safe default)", () => {
    expect(asTheme("theme-9")).toBe("theme-1");
    expect(asTheme(null)).toBe("theme-1");
    expect(asTheme("theme-4")).toBe("theme-4");
    expect(mergeApi({ samithi: { slug: "x", theme: "<img>" } }).theme).toBe("theme-1");
  });

  it("emptyTenant hides every section (never another samithi's data)", () => {
    const empty = emptyTenant("nope", "unknown");
    expect(empty.slug).toBe("nope");
    expect(empty.tenantError).toBe("unknown");
    expect(empty.upcomingEvents).toEqual([]);
    expect(empty.services).toEqual([]);
    expect(empty.stats).toEqual([]);
    expect(empty.coordinators).toEqual([]);
    expect(empty.galleryCategories).toEqual([]);
    expect(emptyTenant("old", "suspended").tenantError).toBe("suspended");
  });

  it("validates slugs and blocks reserved words", () => {
    expect(isValidSlug("porur")).toBe(true);
    expect(isValidSlug("porur-north")).toBe(true);
    expect(isValidSlug("../admin")).toBe(false);
    expect(isValidSlug("admin")).toBe(false);
    expect(isValidSlug("s")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });

  it("keeps the default tenant on root paths", () => {
    expect(tenantBasePath("valasaravakkam")).toBe("");
    expect(tenantBasePath("porur")).toBe("/s/porur");
    expect(tenantBasePath("")).toBe("");
  });

  it("builds tenant API urls (same-origin dev, absolute on Slate)", () => {
    // No NEXT_PUBLIC_FUNCTION_URL in test env → same-origin rewrite path.
    expect(tenantSiteUrl("porur")).toBe("/api/site?samithi=porur");
  });
});
