import { test, expect } from "@playwright/test";
import { ADMIN_PORT } from "./admin.port";

/**
 * Admin CMS UI e2e — runs against the REAL admin server (admin/server.mjs)
 * started by the `admin` Playwright project's webServer (tests/e2e/admin-server.cjs).
 *
 * Uses a throwaway data dir so the developer's real CMS data is never touched:
 * the webServer runs with ADMIN_DATA_DIR + ADMIN_UPLOAD_DIR pointing at a
 * temp dir inside qa-runs.
 */

const ADMIN_URL = `http://127.0.0.1:${ADMIN_PORT}`;

// The webServer writes the same token here before tests start (shared secret).
const ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN || "";

test.describe("admin SPA", () => {
  test.use({ baseURL: ADMIN_URL });

  test.describe.configure({ mode: "serial" });

  let page: import("@playwright/test").Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.addInitScript((token) => {
      sessionStorage.setItem("samithi_admin_token", token);
    }, ADMIN_TOKEN);
  });

  test.afterEach(async () => {
    await page.context().close();
  });

  test("dashboard renders with live counts and template picker", async () => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Samithi Admin" })).toBeVisible();

    const view = page.locator("#view");
    await expect(view).toContainText("Welcome back");
    await expect(view).toContainText("Total Content Items");

    // Live counts from the seeded data dir.
    await expect(page.locator(".dashboard-grid .stat-card").first()).toBeVisible();

    // Template picker switches dashboards.
    await page.locator(".template-btn").nth(1).click();
    await expect(page.locator(".dashboard-compact")).toBeVisible();
    await page.locator(".template-btn").nth(2).click();
    await expect(page.locator(".dashboard-analytics")).toBeVisible();
    await page.locator(".template-btn").nth(0).click();
    await expect(page.locator(".dashboard-compact")).toHaveCount(0);
  });

  test("sidebar navigation lists every collection with counts", async () => {
    await page.goto("/");
    const nav = page.locator("#nav");
    // Accessible names carry an emoji prefix ("🖼️ Gallery"), so match by text
    // content instead — with hasText scoping to avoid the Gallery/Home-Gallery
    // substring collision.
    for (const label of ["Dashboard", "Site Settings", "Upcoming Events", "Services", "Coordinators", "Stats", "Members", "Balvikas Children"]) {
      await expect(nav.getByRole("button").filter({ hasText: label })).toBeAttached();
    }
    // Button text = icon + label + count ("🖼️Gallery1"), so /Gallery/ matches
    // both gallery collections; assert both exist and are distinct.
    await expect(nav.getByRole("button").filter({ hasText: /Gallery/ })).toHaveCount(2);
    // Counts render next to collection labels.
    await expect(nav.locator(".count").first()).toBeVisible();
  });

  test("theme toggle persists dark mode", async () => {
    await page.goto("/");
    await page.locator("#theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const stored = await page.evaluate(() => localStorage.getItem("samithi-admin-theme"));
    expect(stored).toBe("dark");
  });

  test("coordinator CRUD: create via quick-add, validation, save-all persists", async () => {
    await page.goto("/");

    // Navigate to the coordinators collection.
    await page.locator("#nav").getByRole("button").filter({ hasText: /Coordinators/ }).click();
    await expect(page.locator("#breadcrumb")).toContainText("Coordinators");

    // Rows render with the seeded convenor.
    const rows = page.locator(".row");
    await expect(rows.first()).toBeVisible();
    const countBefore = await rows.count();

    // Quick add → "Add Coordinator" (dropdown strips the trailing 's').
    await page.locator("#quick-add-btn").click();
    const dd = page.locator("#quick-add-dropdown");
    await expect(dd).toHaveClass(/open/);
    await dd.locator(".quick-add-item").filter({ hasText: /Add Coordinator/ }).click();

    // Editor overlay: name is required (VALIDATION_RULES.coordinators).
    const overlay = page.locator(".overlay");
    await expect(overlay).toBeVisible();

    // Create with empty name → blocked by validation, overlay stays.
    await overlay.getByRole("button", { name: /Create/ }).click();
    await expect(overlay).toBeVisible();

    // Fill and create for real.
    await overlay.locator("input[type=text]").first().fill("E2E New Coordinator");
    await overlay.getByRole("button", { name: /Create/ }).click();
    await expect(overlay).toBeHidden();
    await expect(page.locator(".toast", { hasText: /Added/ })).toBeVisible();
    await expect(page.locator(".row")).toHaveCount(countBefore + 1, { timeout: 10_000 });

    // Save-all persists to the backend and the save-state clears the dirty flag.
    await page.locator("#save-all").click();
    await expect(page.locator("#save-state")).toContainText(/saved/i, { timeout: 15_000 });
  });

  test("command palette opens with Ctrl+K and navigates", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    const overlay = page.locator("#cmd-overlay");
    await expect(overlay).toBeVisible();

    await page.keyboard.type("events");
    await page.keyboard.press("Enter");
    await expect(page.locator("#breadcrumb")).toContainText(/Events/i);
  });

  test("upload flow accepts a PNG and stores it server-side", async () => {
    await page.goto("/");
    await page.locator("#nav").getByRole("button").filter({ hasText: /Home Gallery/ }).click();
    await page.locator("#quick-add-btn").click();
    await page.locator("#quick-add-dropdown").locator(".quick-add-item").filter({ hasText: /Add Home Gallery/ }).click();

    const overlay = page.locator(".overlay");
    await expect(overlay).toBeVisible();

    // Minimal valid PNG (1x1).
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    );
    // The upload POST is asserted via the persistent preview path (the toast
    // auto-dismisses after ~2.8s, which races under parallel load).
    const uploadPromise = page.waitForResponse(
      (r) => r.url().includes("/api/upload") && r.request().method() === "POST",
    );
    await overlay.locator("input[type=file]").setInputFiles({
      name: "e2e-upload.png",
      mimeType: "image/png",
      buffer: png,
    });
    const uploadRes = await uploadPromise;
    expect(uploadRes.status(), "upload POST must succeed").toBe(200);

    // Preview renders the returned /uploads/… path (persistent UI state).
    await expect(overlay.locator(".image-preview .path")).toContainText("/uploads/", { timeout: 10_000 });
  });

  test("activity log and version history panels open", async () => {
    await page.goto("/");
    await page.locator("#activity-toggle").click();
    await expect(page.locator("#activity-panel")).toHaveClass(/open/);
    await page.locator("#activity-panel .btn-ghost").click();

    await page.locator("#version-toggle").click();
    await expect(page.locator("#version-panel")).toHaveClass(/open/);
  });

  test("logout-ish: bad token keeps UI usable, prompts again", async () => {
    // A wrong token must NOT blank the dashboard: private collections fail,
    // but public content still renders (documented resilience behaviour).
    const context = await (page.context().browser() as import("@playwright/test").Browser).newContext();
    const p2 = await context.newPage();
    await p2.addInitScript(() => {
      sessionStorage.setItem("samithi_admin_token", "definitely-wrong-token");
    });
    await p2.goto("/");
    await expect(p2.getByRole("heading", { name: "Samithi Admin" })).toBeVisible();
    await expect(p2.locator("#view")).toContainText(/Welcome back|Dashboard/i);
    await context.close();
  });

  test("no console errors on dashboard and collection views", async () => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.locator("#nav").getByRole("button", { name: /Services/i }).click();
    await page.locator("#nav").getByRole("button", { name: /Coordinators/i }).click();
    expect(errors).toEqual([]);
  });
});
