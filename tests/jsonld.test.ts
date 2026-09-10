import { describe, it, expect } from "vitest";
import { serializeJsonLd } from "@/lib/jsonld";

describe("serializeJsonLd", () => {
  it("wraps the graph in an @context/@graph envelope", () => {
    const out = JSON.parse(serializeJsonLd([{ "@type": "Organization", name: "X" }]));
    expect(out["@context"]).toBe("https://schema.org");
    expect(out["@graph"]).toEqual([{ "@type": "Organization", name: "X" }]);
  });

  it("does not change the parsed data for normal CMS content", () => {
    const graph = [
      {
        "@type": "Event",
        name: "Ratha Mahotsavam",
        description: "Join us — bhajans & poojas. All are welcome!",
      },
    ];
    expect(JSON.parse(serializeJsonLd(graph))).toEqual({ "@context": "https://schema.org", "@graph": graph });
  });

  it("never emits a raw < that could close the script tag (</script> XSS)", () => {
    // Regression: CMS text containing </script> used to break out of the
    // JSON-LD script tag and execute same-origin script.
    const payload = serializeJsonLd([
      { "@type": "Thing", name: '</script><script>alert(1)</script><script src="//evil.example/x.js">' },
    ]);
    expect(payload).not.toContain("<");
    expect(JSON.parse(payload)["@graph"][0].name).toBe(
      '</script><script>alert(1)</script><script src="//evil.example/x.js">',
    );
  });

  it("never emits <!-- (HTML-comment smuggling inside script tags)", () => {
    const smuggled = "<!--<img src=x onerror=alert(1)>";
    const payload = serializeJsonLd([{ name: smuggled }]);
    // The raw byte sequence <!-- never appears in the serialized text…
    expect(payload).not.toContain("<!--");
    // …while the parsed data round-trips unchanged.
    expect(JSON.parse(payload)["@graph"][0].name).toBe(smuggled);
  });
});
