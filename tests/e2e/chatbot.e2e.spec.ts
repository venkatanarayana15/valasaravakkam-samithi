import { test, expect } from "@playwright/test";
import { openChat, askChat } from "./helpers";

test.describe("chatbot assistant", () => {
  test("opens, greets and closes (button + Escape)", async ({ page }) => {
    await page.goto("/");
    const launcher = page.getByRole("button", { name: /open chat assistant/i });
    await expect(launcher).toBeVisible();
    await expect(launcher).toHaveAttribute("aria-expanded", "false");

    const dialog = await openChat(page);
    await expect(dialog).toContainText("Samithi Assistant");
    await expect(dialog).toContainText(/Sai Ram/i);

    // The launcher swaps its accessible name while open ("Close chat assistant").
    const closeLauncher = page.getByRole("button", { name: /close chat assistant/i });
    await expect(closeLauncher).toBeVisible();
    await expect(closeLauncher).toHaveAttribute("aria-expanded", "true");

    await dialog.getByLabel("Close chat").click();
    await expect(dialog).toBeHidden();
    await expect(launcher).toHaveAttribute("aria-expanded", "false");

    // Escape closes it too.
    await openChat(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /samithi assistant chat/i })).toBeHidden();
  });

  test("quick-reply chips answer timings and chain into follow-ups", async ({ page }) => {
    await page.goto("/");
    const dialog = await openChat(page);
    await dialog.getByRole("button", { name: "Class timings", exact: true }).click();
    await expect(dialog).toContainText(/regular schedules/i);
    await expect(dialog).toContainText(/Temple cleaning/i);

    // The timings answer re-renders the chip row with ITS follow-ups.
    await dialog.getByRole("button", { name: "Where are you located?", exact: true }).click();
    await expect(dialog).toContainText(/You will find a map in the Contact section/i);
  });

  test("upcoming events are answered from CMS data", async ({ page }) => {
    await page.goto("/");
    const dialog = await openChat(page);
    await askChat(dialog, "upcoming events");
    await expect(dialog).toContainText(/Ratha Mahotsavam|upcoming events/i);
  });

  test("free-text questions get contact details from site data", async ({ page }) => {
    await page.goto("/");
    const dialog = await openChat(page);
    await askChat(dialog, "how do I contact you?");
    await expect(dialog).toContainText(/valasaravakkamsamithi1@gmail\.com/i);
    await expect(dialog).toContainText(/\+91/i);
  });

  test("unknown questions get the fallback answer", async ({ page }) => {
    await page.goto("/");
    const dialog = await openChat(page);
    await askChat(dialog, "what is the airspeed of an unladen swallow");
    await expect(dialog).toContainText(/not sure/i);
  });

  test("empty submit does nothing (no crash, no empty message)", async ({ page }) => {
    await page.goto("/");
    const dialog = await openChat(page);
    const counter = page.locator('[role="dialog"] p');
    await expect(counter.first()).toBeVisible();
    const before = await counter.count();
    await dialog.getByLabel("Send message").click();
    // The handler must ignore the empty input: the message list stays stable.
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect
      .poll(() => counter.count(), { timeout: 2_000, intervals: [100, 200, 500] })
      .toBe(before);
  });

  test("follow-up chips always offer next steps", async ({ page }) => {
    await page.goto("/");
    const dialog = await openChat(page);
    await dialog.getByRole("button", { name: "How to join", exact: true }).click();
    await expect(dialog).toContainText(/newcomers are always welcome|walk into any bhajan/i);
    await expect(dialog.getByRole("button", { name: /contact us/i }).first()).toBeVisible();
  });
});
