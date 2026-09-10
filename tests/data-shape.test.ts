import { describe, it, expect } from "vitest";
import { mergeApi, FALLBACK } from "@/lib/data-shape";
import { siteConfig as staticConfig, services as staticServices } from "@/lib/data";

describe("mergeApi", () => {
  it("returns FALLBACK when payload is null (backend unreachable)", () => {
    expect(mergeApi(null)).toBe(FALLBACK);
  });

  it("falls back to static content when a key is absent", () => {
    const merged = mergeApi({ stats: [] });
    expect(merged.stats).toEqual([]);
    expect(merged.services).toBe(staticServices); // absent → static
  });

  it("trusts empty arrays when the key is present (admin cleared it)", () => {
    // Regression: the old double-fallback resurrected deleted CMS content.
    const merged = mergeApi({ services: [] });
    expect(merged.services).toEqual([]);
  });

  it("merges partial siteConfig over static defaults", () => {
    const merged = mergeApi({
      siteconfig: { siteConfig: { phone: "+91 0000000000" } },
    });
    expect(merged.siteConfig.phone).toBe("+91 0000000000");
    expect(merged.siteConfig.email).toBe(staticConfig.email);
  });

  it("accepts edited CMS collections", () => {
    const services = [{ icon: "fa-om", title: "Edited", description: "x" }];
    const merged = mergeApi({ services });
    expect(merged.services).toEqual(services);
  });

  it("defaults members/balvikas to empty arrays when absent", () => {
    const merged = mergeApi({});
    expect(merged.members).toEqual([]);
    expect(merged.balvikas).toEqual([]);
  });
});
