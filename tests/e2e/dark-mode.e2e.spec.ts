import { test, expect } from "@playwright/test";

test.describe("dark mode", () => {
  test("toggles theme, sets data-theme and persists across reloads", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /switch to (dark|light) mode/i });
    await expect(toggle).toHaveAttribute("aria-label", "Switch to dark mode");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(toggle).toHaveAttribute("aria-label", "Switch to light mode");
    const stored = await page.evaluate(() => localStorage.getItem("theme"));
    expect(stored).toBe("dark");

    // Reload: stored choice must survive (no flash back to light).
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // And toggling back returns to light.
    await page.getByRole("button", { name: /switch to light mode/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("dark mode is user-choice only: OS dark preference never auto-switches", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("pre-hydration inline script prevents flash of wrong theme", async ({ page }) => {
    // Set storage before any page script runs, then block until DOM-ready and
    // check the class was applied by the inline <head> script immediately.
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
