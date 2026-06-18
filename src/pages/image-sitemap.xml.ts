import { getCollection } from "astro:content";

const site = "https://kinktest.xyz";
const homeImage = "/images/home-reflection-map.svg";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function imageEntry(pagePath: string, imagePath: string) {
  return [
    "  <url>",
    `    <loc>${escapeXml(new URL(pagePath, site).toString())}</loc>`,
    "    <image:image>",
    `      <image:loc>${escapeXml(new URL(imagePath, site).toString())}</image:loc>`,
    "    </image:image>",
    "  </url>",
  ].join("\n");
}

export async function GET() {
  const guides = (await getCollection("guides")).sort((a, b) => a.data.order - b.data.order);
  const entries = [
    imageEntry("/", homeImage),
    ...guides.map((guide) =>
      imageEntry(`/guides/${guide.slug}/`, guide.data.image.src),
    ),
  ];

  return new Response(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
      ...entries,
      "</urlset>",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    },
  );
}
