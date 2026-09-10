import { buildLlmsTxt } from "@/lib/llms";

// Static-friendly: content is compiled from shipped constants (no fetch),
// so this works identically in server and static-export (Slate) builds.
export const dynamic = "force-static";

export async function GET() {
  return new Response(buildLlmsTxt(), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
