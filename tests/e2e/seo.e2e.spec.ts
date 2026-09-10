import { test, expect } from "@playwright/test";
import { SITE_URL } from "@/lib/seo";

test.describe("SEO & discoverability", () => {
  test("home page emits canonical, OG and Twitter metadata", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", SITE_URL);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
  });

  test("JSON-LD: Organization + LocalBusiness with parseable, breakout-safe payload", async ({ page }) => {
    await page.goto("/");
    const scripts = page.locator('script[type="application/ld+json"]');
    const payloads = await scripts.evaluateAll((els) => els.map((el) => el.textContent ?? ""));

    // The serialized payload must never contain a raw "<" (script-tag breakout).
    for (const p of payloads) expect(p).not.toContain("<");

    const graph = payloads.flatMap((p) => {
      const parsed = JSON.parse(p) as { "@graph": Record<string, unknown>[] };
      return parsed["@graph"];
    });
    const org = graph.find((n) => Array.isArray(n["@type"]) && (n["@type"] as string[]).includes("Organization"));
    expect(org).toBeDefined();
    expect(org!.telephone).toBeTruthy();
  });

  test("robots.txt excludes admin/api/thank-you from indexing", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("Disallow: /admin");
    expect(body).toContain("Disallow: /thank-you");
    expect(body).toContain("Sitemap:");
  });

  test("sitemap.xml lists home, gallery and every category", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain(`${SITE_URL}/gallery`);
    for (const slug of ["balvikas", "temple-cleaning", "bhajans", "other"]) {
      expect(body).toContain(`${SITE_URL}/gallery/${slug}`);
    }
  });

  test("security.txt is published at both RFC 9116 locations", async ({ request }) => {
    for (const path of ["/security.txt", "/.well-known/security.txt"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      const body = await res.text();
      expect(body).toContain("Contact:");
      expect(body).toContain("Policy:");
    }
  });

  test("humans.txt is served", async ({ request }) => {
    const res = await request.get("/humans.txt");
    expect(res.status()).toBe(200);
  });

  test("web app manifest is valid and themed", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = (await res.json()) as { name?: string; theme_color?: string };
    expect(manifest.name).toContain("Valasaravakkam");
    expect(manifest.theme_color).toMatch(/^#/);
  });

  test("gallery pages emit ImageGallery JSON-LD with safe serialization", async ({ page }) => {
    await page.goto("/gallery/balvikas");
    const payload = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .evaluate((el) => el.textContent ?? "");
    expect(payload).not.toContain("<");
    const parsed = JSON.parse(payload) as { "@graph": Record<string, unknown>[] };
    expect(parsed["@graph"].some((n) => n["@type"] === "ImageGallery")).toBe(true);
    expect(parsed["@graph"].some((n) => n["@type"] === "BreadcrumbList")).toBe(true);
  });
});
