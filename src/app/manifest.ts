import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/seo";

// Required for static export (Slate); harmless in server mode.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Valasaravakkam Samithi",
    short_name: "Samithi",
    description:
      "Sri Sathya Sai Seva Organisation - Valasaravakkam Samithi, Chennai Metro West. Love All, Serve All. Help Ever, Hurt Never.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: BRAND.primary,
    icons: [
      {
        src: "/assets/img/sssso-emblem-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/img/sssso-emblem-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
