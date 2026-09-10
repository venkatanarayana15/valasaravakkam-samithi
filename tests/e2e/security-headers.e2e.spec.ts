import { test, expect } from "@playwright/test";
import { securityHeaderContract } from "./security-contract";

test.describe("security headers", () => {
  for (const route of ["/", "/gallery", "/gallery/balvikas", "/security", "/thank-you", "/this-is-404"]) {
    test(`applied on ${route}`, async ({ request }) => {
      const res = await request.get(route);
      expect(res.status(), `${route} should respond`).toBeLessThan(500);
      for (const { key, value } of securityHeaderContract) {
        expect.soft(res.headers()[key.toLowerCase()], `${key} on ${route}`).toBe(value);
      }
    });
  }

  test("no X-Powered-By fingerprint is leaked", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });

  test("CSP blocks script injection from any non-allowed source", async ({ request }) => {
    const res = await request.get("/");
    const csp = res.headers()["content-security-policy"] ?? "";
    for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'"]) {
      expect(csp).toContain(directive);
    }
    // script-src must never be wildcarded
    expect(csp).not.toMatch(/script-src[^;]*\*/);
  });

  test("API proxy responses keep the headers too", async ({ request }) => {
    // /api/site rewrites to a dead admin target -> 5xx is expected, but Next
    // still emits the security headers for the route.
    const res = await request.get("/api/site");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });
});
