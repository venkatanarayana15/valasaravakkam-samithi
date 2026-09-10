import SamithiHome from "@/components/home/SamithiHome";
import JsonLd from "@/components/JsonLd";
import { buildHomeJsonLd, buildFaqJsonLd } from "@/lib/seo";
import { getServerSiteData } from "@/lib/server-data";

export default async function Home() {
  const data = await getServerSiteData();
  const jsonLd = buildHomeJsonLd(data);

  return (
    <>
      <JsonLd graph={jsonLd} id="jsonld-home" />
      <JsonLd graph={buildFaqJsonLd()} id="jsonld-faq" />
      <SamithiHome />
    </>
  );
}
