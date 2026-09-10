import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // GEO stance: AI answer engines and their crawlers are explicitly welcome
  // (they cite /llms.txt + structured data). Admin/API/utility paths stay
  // closed to everyone, bots included.
  const closed = ["/admin", "/_ui", "/api/", "/thank-you"];
  return {
    rules: [
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Anthropic-AI",
          "PerplexityBot",
          "Bytespider",
          "Applebot-Extended",
          "Google-Extended",
          "Amazonbot",
        ],
        allow: "/",
        disallow: closed,
      },
      {
        userAgent: "*",
        allow: "/",
        // Keep the CMS proxy surface and utility pages out of the index.
        disallow: closed,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
