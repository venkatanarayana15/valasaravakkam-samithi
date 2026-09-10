import type { NextConfig } from "next";

const ADMIN_TARGET = process.env.ADMIN_TARGET || "http://localhost:3001";
// Catalyst function base (…/server/site-api/execute). When set, /api/site and
// /api/contact are served from Catalyst instead of the local admin server.
const CATALYST_API = (process.env.CATALYST_SITE_API_URL || "").replace(/\/$/, "");

const usingCatalyst = Boolean(CATALYST_API);
const siteApiTarget = usingCatalyst ? `${CATALYST_API}/site` : `${ADMIN_TARGET}/api/site`;
const contactApiTarget = usingCatalyst ? `${CATALYST_API}/contact` : `${ADMIN_TARGET}/api/contact`;

// Set NEXT_STATIC_EXPORT=1 only for the Slate production build.
const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";

const rewrites = [
  {
    source: "/api/site",
    destination: siteApiTarget,
  },
  {
    source: "/api/contact",
    destination: contactApiTarget,
  },
  // In Catalyst mode there is no standalone admin server to proxy to —
  // /admin, /uploads and the remaining /api routes would 502. Content
  // management then happens through the Catalyst Data Store directly.
  ...(usingCatalyst
    ? []
    : [
        {
          source: "/api/:path*",
          destination: `${ADMIN_TARGET}/api/:path*`,
        },
        {
          source: "/admin",
          destination: `${ADMIN_TARGET}/`,
        },
        {
          source: "/admin/:path*",
          destination: `${ADMIN_TARGET}/:path*`,
        },
        {
          source: "/_ui/:path*",
          destination: `${ADMIN_TARGET}/_ui/:path*`,
        },
        {
          source: "/uploads/:path*",
          destination: `${ADMIN_TARGET}/uploads/:path*`,
        },
      ]),
];

// Security headers for the public site.
// The self-hosted admin server (:3001) sets its own headers per response
// and is not behind this Next.js app, so those stay independent.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Embedder-Policy",
    // `credentialless` instead of `require-corp`: Google Maps / YouTube embeds
    // send CORP: same-origin, which `require-corp` blocks outright
    // (ERR_BLOCKED_BY_RESPONSE — the contact map never rendered).
    // `credentialless` keeps the isolation (no credentials flow into embedded
    // frames) while letting those embeds load. Browsers without support ignore it.
    value: "credentialless",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
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

const nextConfig: NextConfig = {
  // Don't advertise the framework version in `X-Powered-By`.
  poweredByHeader: false,
  // Static export for Catalyst Slate hosting: NEXT_STATIC_EXPORT=1 at build
  // time. Dev and `npm start` (default) keep the Node server + rewrites.
  // NOTE: output:"export" ignores rewrites()/headers() below, so they are
  // only attached in server mode — casualties of static hosting, all
  // replaced by absolute function URLs + Slate-side headers.
  ...(isStaticExport
    ? {
        output: "export" as const,
        images: { unoptimized: true },
      }
    : {
        images: {
          remotePatterns: [
            {
              protocol: "https",
              hostname: "*.zohostratus.in",
            },
          ],
        },
        async rewrites() {
          return rewrites;
        },
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: securityHeaders,
            },
          ];
        },
      }),
};

export default nextConfig;
