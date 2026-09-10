import { test, expect } from "@playwright/test";
import { PORT } from "./port";

test.describe("home page (desktop + mobile)", () => {
  test("renders hero, sections and CMS-driven content", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Valasaravakkam Samithi/i);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Sri Sathya Sai Seva Organisation/i);
    await expect(page.locator("#hero")).toBeVisible();
    await expect(page.locator("#upcoming-events")).toBeVisible();
    await expect(page.locator("#services")).toBeVisible();
    await expect(page.locator("#about")).toBeVisible();
    await expect(page.locator("#contact")).toBeVisible();
    // Static fallback content (admin deliberately unreachable in e2e).
    await expect(page.locator("#services")).toContainText("Bhajans");
    await expect(page.locator("#services")).toContainText("Balvikas");
  });

  test("hero CTAs navigate to their sections", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "See Upcoming Events" }).click();
    await expect(page).toHaveURL(new RegExp(`127\\.0\\.0\\.1:${PORT}/#upcoming-events`));
    await expect(page.locator("#upcoming-events")).toBeInViewport();
  });

  test("all section anchors resolve to real elements", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator('a[href^="/#"], a[href^="#"]').evaluateAll((els) =>
      els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
    );
    const unique = [...new Set(hrefs)].filter((h) => h.length > 1);
    expect(unique.length).toBeGreaterThan(0);
    for (const href of unique) {
      const id = href.replace(/^\/?#/, "");
      await expect(page.locator(`#${id}`).first(), `anchor target #${id} should exist`).toHaveCount(1);
    }
  });

  test("every external link is noopener-hardened and https", async ({ page }) => {
    await page.goto("/");
    const external = await page.locator('a[href^="http"]').evaluateAll((els) =>
      els.map((el) => ({
        href: (el as HTMLAnchorElement).href,
        target: (el as HTMLAnchorElement).target,
        rel: (el as HTMLAnchorElement).rel,
      })),
    );
    expect(external.length).toBeGreaterThan(0);
    for (const link of external) {
      expect(link.href.startsWith("https://"), `${link.href} must be https`).toBe(true);
      if (link.target === "_blank") {
        expect(link.rel).toContain("noopener");
        expect(link.rel).toContain("noreferrer");
      }
    }
  });

  test("skip link is first focusable and targets main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /skip to main content/i })).toBeFocused();
    await expect(page.locator("#main-content")).toHaveCount(1);
  });

  test("footer renders social links with accessible names", async ({ page }) => {
    await page.goto("/");
    for (const name of [/facebook/i, /instagram/i, /youtube/i, /whatsapp/i]) {
      await expect(page.getByRole("contentinfo").getByRole("link", { name })).toBeVisible();
    }
  });
});
