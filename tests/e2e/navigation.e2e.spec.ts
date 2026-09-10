import { test, expect } from "@playwright/test";

test.describe("navigation", () => {
  test("mobile: bottom nav renders, navigates and tracks the active section", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: /mobile navigation/i });
    await expect(nav).toBeVisible();

    // All six links are reachable from the bar.
    for (const label of ["Home", "Events", "Memories", "Services", "About", "Contact"]) {
      await expect(nav.getByRole("link", { name: new RegExp(`^${label}$`, "i") })).toBeAttached();
    }

    await nav.getByRole("link", { name: /^Contact$/i }).click();
    await expect(page.locator("#contact")).toBeInViewport();
  });

  test("mobile: bottom nav is hidden on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: /mobile navigation/i })).toBeHidden();
    await expect(page.getByRole("navigation", { name: /primary navigation/i })).toBeVisible();
  });

  test("desktop: primary nav highlights the active section", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: /primary navigation/i });
    await nav.getByRole("link", { name: /Services/i }).click();
    await expect(page.locator("#services")).toBeInViewport();
    await expect(nav.locator('a[aria-current="page"]')).toContainText(/Services|Contact|Home/i);
  });

  test("unknown routes render the 404 page with a working way home", async ({ page }) => {
    const res = await page.goto("/this-route-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await page.getByRole("link", { name: /return to home/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("#hero")).toBeVisible();
  });
});
