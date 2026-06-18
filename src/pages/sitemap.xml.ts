export function GET() {
  return new Response(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      "  <sitemap>",
      "    <loc>https://kinktest.xyz/sitemap-0.xml</loc>",
      "  </sitemap>",
      "  <sitemap>",
      "    <loc>https://kinktest.xyz/image-sitemap.xml</loc>",
      "  </sitemap>",
      "</sitemapindex>",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    },
  );
}
