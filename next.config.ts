import type { NextConfig } from "next";

const ADMIN_TARGET = process.env.ADMIN_TARGET || "http://localhost:3001";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.monkeycode-ai.live"],
  async rewrites() {
    return [
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
    ];
  },
};

export default nextConfig;
