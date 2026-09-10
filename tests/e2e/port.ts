/**
 * Single source of truth for the port used by the Playwright webServer and
 * the e2e specs. Kept in a tiny dependency-free module so it can be imported
 * from both playwright.config.ts and the specs without pulling in the
 * Playwright runner.
 */
export const PORT = Number(process.env.E2E_PORT || 4173);
