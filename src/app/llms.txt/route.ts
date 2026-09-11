import { buildLlmsTxt, fetchLlmsSamithis } from "@/lib/llms";

// Revalidate hourly so new samithis appear in the LLM index without a rebuild.
export const revalidate = 3600;

export async function GET() {
  const live = await fetchLlmsSamithis();
  return new Response(buildLlmsTxt(live || undefined), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
