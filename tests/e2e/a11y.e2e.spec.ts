import { test, expect } from "@playwright/test";

test.describe("robustness & accessibility", () => {
  for (const route of ["/", "/gallery", "/gallery/balvikas", "/security", "/thank-you"]) {
    test(`no console/page errors on ${route}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));
      await page.goto(route, { waitUntil: "networkidle" });
      // Next.js sometimes preloads a CSS chunk that the static shell doesn't
      // reference within a few seconds — a preload hint warning, not an app bug.
      const realErrors = errors.filter((e) => !/was preloaded using link preload but not used/i.test(e));
      expect(realErrors, `console errors on ${route}`).toEqual([]);
    });
  }

  test("landmark structure: banner, main, contentinfo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("banner").first()).toBeAttached();
    await expect(page.getByRole("contentinfo")).toBeAttached();
  });

  test("every img exposes alt text (decorative ones empty)", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const bad = await page.locator("img:not([alt])").count();
    expect(bad, "images without alt attribute").toBe(0);
  });

  test("icon-only buttons and links have accessible names", async ({ page }) => {
    await page.goto("/");
    const unnamed = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, a[href]'));
      return els.filter((el) => {
        const name =
          el.getAttribute("aria-label") ||
          el.getAttribute("aria-labelledby") ||
          el.textContent?.trim() ||
          (el as HTMLElement).title;
        return !name;
      }).length;
    });
    expect(unnamed, "focusable controls without accessible names").toBe(0);
  });

  test("html lang is set for screen readers", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
