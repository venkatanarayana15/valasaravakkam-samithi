import { expect, type Page } from "@playwright/test";

/**
 * Deterministic CMS outage check: the e2e webServer points ADMIN_TARGET at a
 * dead port, so /api/site must fail — the site renders its static fallback.
 * The UI specs don't depend on which content source wins, so this is only an
 * informational probe used by developers; nothing asserts on its result.
 */
export async function probeApiSite(page: Page): Promise<number | null> {
  try {
    const res = await page.request.get("/api/site");
    return res.status();
  } catch {
    return null;
  }
}

/** Open the chatbot and return a small driver for it. */
export async function openChat(page: Page) {
  await page.getByRole("button", { name: /open chat assistant/i }).click();
  const dialog = page.getByRole("dialog", { name: /samithi assistant chat/i });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Ask the chatbot a question and wait for the bot reply that follows. */
export async function askChat(dialog: ReturnType<typeof openChat> extends Promise<infer D> ? D : never, question: string) {
  await dialog.getByLabel("Type your question").fill(question);
  await dialog.getByLabel("Type your question").press("Enter");
  await dialog.getByText(question).first().waitFor();
}
