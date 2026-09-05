import type { NextConfig } from "next";

const ADMIN_TARGET = process.env.ADMIN_TARGET || "http://localhost:3001";
// Catalyst function base (…/server/site-api/execute). When set, /api/site and
// /api/contact are served from Catalyst instead of the local admin server.
const CATALYST_API = (process.env.CATALYST_SITE_API_URL || "").replace(/\/$/, "");

const siteApiTarget = CATALYST_API ? `${CATALYST_API}/site` : `${ADMIN_TARGET}/api/site`;
const contactApiTarget = CATALYST_API ? `${CATALYST_API}/contact` : `${ADMIN_TARGET}/api/contact`;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.monkeycode-ai.live"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.zohostratus.in",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/site",
        destination: siteApiTarget,
      },
      {
        source: "/api/contact",
        destination: contactApiTarget,
      },
      {
        // Everything else still goes to the standalone admin server.
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
    ];
  },
};

export default nextConfig;
