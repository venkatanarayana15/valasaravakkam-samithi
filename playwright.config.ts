import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import crypto from "node:crypto";
import { PORT } from "./tests/e2e/port";
import { ADMIN_PORT } from "./tests/e2e/admin.port";

// Generated in the RUNNER process so both the admin webServer (via env below)
// and the test workers (via process.env inheritance) see the same secret.
// The launcher (tests/e2e/admin-server.cjs) consumes it, it never generates one.
process.env.E2E_ADMIN_TOKEN ||= crypto.randomBytes(16).toString("hex");

export const QA_DIR = path.resolve(__dirname, "qa-runs");

/**
 * Pro-level UI e2e: the production build is served by `next start` and probed
 * from real Chromium (desktop + mobile). Artifacts (trace, video, screenshots)
 * land in qa-runs/ which is gitignored.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // Vitest owns tests/**; Playwright only takes the e2e subdir (belt & braces:
  // vitest.config.ts also excludes it).
  testMatch: /.*\.e2e\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  // Failure artifacts + HTML report under qa-runs/
  outputDir: path.join(QA_DIR, "test-results"),
  reporter: [
    ["list"],
    ["html", { outputFolder: path.join(QA_DIR, "report"), open: "never" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    // A realistic desktop UA keeps any UA-sniffing code paths honest.
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testIgnore: /admin\.e2e\.spec\.ts/,
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
      testIgnore: /admin\.e2e\.spec\.ts/,
    },
    {
      name: "admin",
      testDir: "./tests/e2e",
      testMatch: /admin\.e2e\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      command: "npm run start",
      url: `http://127.0.0.1:${PORT}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
      stderr: "pipe",
      env: {
        ...process.env,
        PORT: String(PORT),
        // The admin backend is NOT part of the e2e target: the site must render
        // fully from its static fallback when the CMS is unreachable.
        ADMIN_TARGET: "http://127.0.0.1:1",
      },
    },
    // Second server: the REAL admin CMS with a throwaway data dir.
    // tests/e2e/admin-server.cjs generates the token and exports it as
    // E2E_ADMIN_TOKEN for the admin specs.
    {
      command: `node tests/e2e/admin-server.cjs`,
      url: `http://127.0.0.1:${ADMIN_PORT}/api/health`,
      timeout: 60_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        E2E_ADMIN_PORT: String(ADMIN_PORT),
        E2E_ADMIN_TOKEN: process.env.E2E_ADMIN_TOKEN,
      },
    },
  ],
});
