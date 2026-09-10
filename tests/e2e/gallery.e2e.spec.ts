import { test, expect } from "@playwright/test";

test.describe("gallery index", () => {
  test("lists all categories with links", async ({ page }) => {
    await page.goto("/gallery");
    for (const label of [/Balvikas/i, /Temple Cleaning/i, /Bhajans/i, /Other/i]) {
      await expect(page.getByRole("link", { name: label }).first()).toBeVisible();
    }
    await page.getByRole("link", { name: /Balvikas/i }).first().click();
    await expect(page).toHaveURL(/\/gallery\/balvikas$/);
  });
});

test.describe("category gallery + lightbox", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/gallery/balvikas");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Balvikas Gallery/i);
  });

  test("opens the lightbox from a thumbnail", async ({ page }) => {
    await page.getByRole("button", { name: /view .+ in lightbox/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/1 \/ \d+/);
  });

  test("keyboard: arrows navigate, Escape closes, focus returns to the grid", async ({ page }) => {
    const thumb = page.getByRole("button", { name: /view .+ in lightbox/i }).first();
    await thumb.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Focus moves into the dialog.
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)).toBe(true);

    const counter = () => dialog.locator("text=/\\d+ \\/ \\d+/").first().innerText();
    const start = await counter();
    await page.keyboard.press("ArrowRight");
    expect(await counter()).not.toEqual(start);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // Focus is restored to the invoking thumbnail (never dropped to <body>).
    await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe("BUTTON");
    await expect(thumb).toBeFocused();
  });

  test("prev/next buttons wrap around the image list", async ({ page }) => {
    await page.getByRole("button", { name: /view .+ in lightbox/i }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Previous image").click();
    // From 1/N going backwards wraps to N/N.
    await expect(dialog.locator("text=/\\d+ \\/ \\d+/").first()).toContainText(/\d+ \/ \d+/);
    await expect(dialog).toBeVisible();
  });

  test("download button is present with an accessible label", async ({ page }) => {
    await page.getByRole("button", { name: /view .+ in lightbox/i }).first().click();
    await expect(page.getByLabel("Download image")).toBeVisible();
  });

  test("close button hides the lightbox", async ({ page }) => {
    await page.getByRole("button", { name: /view .+ in lightbox/i }).first().click();
    await page.getByLabel("Close", { exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("back link returns to the gallery index", async ({ page }) => {
    await page.getByRole("link", { name: /back to gallery/i }).click();
    await expect(page).toHaveURL(/\/gallery$/);
  });
});
