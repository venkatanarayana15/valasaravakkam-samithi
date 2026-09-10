import { serializeJsonLd } from "@/lib/jsonld";

type JsonLdProps = {
  graph: Record<string, unknown>[];
  id?: string;
};

/**
 * Renders a JSON-LD @graph. React escapes the string content, and
 * serializeJsonLd re-encodes `<`/`>` so CMS text cannot close the script tag
 * early (`</script>`) or open an HTML comment (`<!--`) inside it. The
 * escaping preserves the parsed data byte-for-byte.
 */
export default function JsonLd({ graph, id = "jsonld" }: JsonLdProps) {
  const payload = serializeJsonLd(graph);
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: payload }}
    />
  );
}
