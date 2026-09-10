/**
 * Serialize a JSON-LD payload for embedding in a <script type="application/ld+json"> tag.
 *
 * JSON.stringify alone is NOT enough: raw `<` characters inside string values
 * allow an attacker-controlled `</script>` to close the tag early (script-tag
 * XSS) and `<!--` to open an HTML comment that swallows the rest of the page.
 * Re-encoding `<`/`>`/line-separators as JSON unicode escapes keeps the parsed
 * data byte-identical while making breakout impossible.
 */
export function serializeJsonLd(graph: Record<string, unknown>[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
