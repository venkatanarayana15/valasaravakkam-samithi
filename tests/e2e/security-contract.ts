/**
 * Single source of truth for the site's security-header contract.
 * Mirrors next.config.ts — the e2e suite fails if headers drift, and
 * SECURITY.md cites this as the enforced baseline.
 */
export const securityHeaderContract: { key: string; value: string }[] = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://www.youtube.com https://www.youtube-nocookie.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https://*.zohoapis.com https://*.catalystserverless.com https://*.onslate.com https://formsubmit.co https://www.google.com https://www.google-analytics.com https://chat.whatsapp.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://formsubmit.co",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];
