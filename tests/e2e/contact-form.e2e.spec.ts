import { test, expect } from "@playwright/test";

test.describe("contact form", () => {
  const fillForm = async (page: import("@playwright/test").Page) => {
    await page.locator("#name-field").fill("Test Devotee");
    await page.locator("#email-field").fill("devotee@example.com");
    await page.locator("#subject-field").fill("E2E test message");
    await page.locator("#message-field").fill("Vanakkam — this is an automated e2e check, please ignore.");
  };

  test("renders with honeypot, hidden FormSubmit fields and accessible labels", async ({ page }) => {
    await page.goto("/");
    const form = page.locator('form:has(#name-field)');
    await expect(form).toBeVisible();
    await expect(form.locator('input[name="_honey"]')).toBeAttached();
    await expect(form.locator('input[name="_honey"]')).toBeHidden();
    await expect(form.locator('input[name="_captcha"]')).toHaveValue("false");
    for (const id of ["name-field", "email-field", "subject-field", "message-field"]) {
      await expect(page.locator(`label[for="${id}"]`)).toBeVisible();
    }
  });

  test("HTML5 validation blocks empty submits", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Send Message" }).click();
    // required fields keep the form on the page with validity messages
    const nameValid = await page.locator("#name-field").evaluate((el) => (el as HTMLInputElement).validity.valid);
    expect(nameValid).toBe(false);
    await expect(page).not.toHaveURL(/thank-you/);
  });

  test("successful Catalyst submit shows confirmation and resets", async ({ page }) => {
    await page.route("**/api/contact*", (route) => route.fulfill({ status: 200, body: "ok" }));
    await page.goto("/");
    await fillForm(page);
    await page.getByRole("button", { name: "Send Message" }).click();
    await expect(page.getByText(/we appreciate your message/i)).toBeVisible();
    await expect(page.locator("#name-field")).toHaveValue("", { timeout: 10_000 });
  });

  test("falls back to FormSubmit when Catalyst is down", async ({ page }) => {
    let catalystHits = 0;
    let fallbackHits = 0;
    await page.route("**/api/contact*", (route) => {
      catalystHits++;
      return route.fulfill({ status: 502, body: "bad gateway" });
    });
    await page.route("https://formsubmit.co/**", (route) => {
      fallbackHits++;
      // Cross-origin fetch: without ACAO the browser blocks the response and
      // the app would (correctly) report an error instead of success.
      return route.fulfill({
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: "ok",
      });
    });
    await page.goto("/");
    await fillForm(page);
    await page.getByRole("button", { name: "Send Message" }).click();
    await expect(page.getByText(/we appreciate your message/i)).toBeVisible();
    await expect.poll(() => catalystHits, "Catalyst transport was tried first").toBeGreaterThanOrEqual(1);
    await expect.poll(() => fallbackHits, "FormSubmit fallback engaged").toBeGreaterThanOrEqual(1);
  });

  test("shows an error state when every transport fails", async ({ page }) => {
    await page.route("**/api/contact*", (route) => route.fulfill({ status: 502, body: "no" }));
    await page.route("https://formsubmit.co/**", (route) => route.abort());
    await page.goto("/");
    await fillForm(page);
    await page.getByRole("button", { name: "Send Message" }).click();
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
    // Status is announced to screen readers.
    await expect(page.locator('[role="status"][aria-live="polite"]')).toBeVisible();
  });

  test("submit button is disabled while sending", async ({ page }) => {
    await page.route("**/api/contact*", async (route) => {
      // Hold the response long enough for the "Sending..." state to be
      // observable even under parallel-worker CPU contention.
      await new Promise((r) => setTimeout(r, 1500));
      await route.fulfill({ status: 200, body: "ok" });
    });
    await page.goto("/");
    await fillForm(page);
    const send = page.getByRole("button", { name: "Send Message" });
    await send.click();
    await expect(page.getByRole("button", { name: "Sending..." })).toBeDisabled();
    await expect(page.getByText(/we appreciate your message/i)).toBeVisible();
  });
});
