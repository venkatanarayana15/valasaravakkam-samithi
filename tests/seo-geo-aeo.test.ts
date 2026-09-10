import { describe, it, expect } from "vitest";
import { buildFaqJsonLd } from "@/lib/seo";
import { buildLlmsTxt } from "@/lib/llms";

describe("buildFaqJsonLd", () => {
  it("emits a single FAQPage with capped questions", () => {
    const graph = buildFaqJsonLd();
    expect(graph).toHaveLength(1);
    expect(graph[0]["@type"]).toBe("FAQPage");
    const qs = graph[0].mainEntity as unknown[];
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.length).toBeLessThanOrEqual(8);
    for (const q of qs as Record<string, unknown>[]) {
      expect(q["@type"]).toBe("Question");
      expect(typeof q.name).toBe("string");
      const a = q.acceptedAnswer as Record<string, unknown>;
      expect(a["@type"]).toBe("Answer");
      expect(typeof a.text).toBe("string");
      expect((a.text as string).length).toBeGreaterThan(0);
    }
  });

  it("parameterises the org name for tenant pages", () => {
    const graph = buildFaqJsonLd("Porur Samithi");
    const qs = graph[0].mainEntity as Record<string, unknown>[];
    expect(qs[0].name).toContain("Porur Samithi");
  });

  it("never emits empty answers", () => {
    const graph = buildFaqJsonLd();
    const qs = graph[0].mainEntity as Record<string, unknown>[];
    for (const q of qs) {
      expect(((q.acceptedAnswer as Record<string, unknown>).text as string).trim().length).toBeGreaterThan(0);
    }
  });
});

describe("buildLlmsTxt", () => {
  it("covers identity, programs, contact and network links", () => {
    const txt = buildLlmsTxt();
    expect(txt).toContain("# Valasaravakkam Samithi");
    expect(txt).toContain("Love All, Serve All");
    expect(txt).toContain("## Programs");
    expect(txt).toContain("Bhajans");
    expect(txt).toContain("+91 9087951742");
    expect(txt).toContain("/samithis");
    expect(txt).toContain("/s/valasaravakkam");
    expect(txt).toContain("/gallery");
  });

  it("uses absolute URLs only (no relative links for crawlers)", () => {
    const txt = buildLlmsTxt();
    for (const line of txt.split("\n")) {
      if (line.startsWith("- ") && (line.includes("/s/") || line.includes("/gallery") || line.includes("/samithis") || line.includes("/#contact"))) {
        expect(line).toContain("https://");
      }
    }
  });
});
