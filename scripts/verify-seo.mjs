import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const distDir = "dist";
const failures = [];
const htmlFiles = await findHtmlFiles(distDir);

if (htmlFiles.length !== 10) {
  failures.push(`Expected 10 built HTML pages including 404.html, found ${htmlFiles.length}.`);
}

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const name = relative(distDir, file).replaceAll("\\", "/");
  const h1Count = count(html, /<h1[\s>]/g);
  const isHome = name === "index.html";
  const is404 = name === "404.html";
  const guideSlug = name.match(/^guides\/([^/]+)\/index\.html$/)?.[1];
  const expectedImageSlug = isHome || is404 ? "home-reflection-map" : guideSlug;
  const expectedImageUrl = `https://kinktest.xyz/images/${expectedImageSlug}.png`;
  const imageTags = html.match(/<img\b[^>]*>/g) ?? [];
  const missingAltImages = imageTags.filter(
    (tag) => !/\salt(?:="[^"]*")?(?=\s|>)/.test(tag),
  );
  const emptyAltImages = imageTags.filter(
    (tag) => /\salt(?:=""|(?=\s|>))/.test(tag),
  );
  const describedImages = imageTags.filter((tag) => /\salt="[^"]+"/.test(tag));
  const hasGoogleAnalyticsTag = html.includes("https://www.googletagmanager.com/gtag/js?id=G-0WMYJDTP5G") &&
    html.includes("gtag('config', 'G-0WMYJDTP5G')");

  assert(h1Count === 1, `${name}: expected exactly one H1, found ${h1Count}.`);
  assert(/<title>[^<]+<\/title>/.test(html), `${name}: missing title.`);
  assert(/<meta name="description" content="[^"]+"/.test(html), `${name}: missing meta description.`);
  assert(/<link rel="canonical" href="https:\/\/kinktest\.xyz\/[^"]*"/.test(html), `${name}: missing canonical.`);
  assert(
    html.includes(`<meta property="og:image" content="${expectedImageUrl}">`),
    `${name}: missing page-specific OG image.`,
  );
  assert(
    /<meta property="og:image:alt" content="[^"]+">/.test(html),
    `${name}: missing descriptive OG image alt text.`,
  );
  assert(
    /<meta name="twitter:image:alt" content="[^"]+">/.test(html),
    `${name}: missing descriptive Twitter image alt text.`,
  );
  assert(
    html.includes('<meta property="og:image:width" content="1200">') &&
      html.includes('<meta property="og:image:height" content="630">') &&
      html.includes('<meta property="og:image:type" content="image/png">'),
    `${name}: missing OG image dimensions or type.`,
  );
  assert(missingAltImages.length === 0, `${name}: found images without an alt attribute.`);
  if (is404) {
    assert(/<meta name="robots" content="noindex, nofollow"/.test(html), `${name}: 404 page must be noindex.`);
  } else {
    assert(
      /<meta name="robots" content="index, follow, max-image-preview:large"/.test(html),
      `${name}: missing indexable robots meta.`,
    );
  }
  assert(
    count(html, /<script type="application\/ld\+json">/g) >= 2,
    `${name}: expected at least two JSON-LD blocks.`,
  );
  assert(hasGoogleAnalyticsTag, `${name}: missing Google Analytics tag.`);

  if (isHome) {
    assert(imageTags.length === 9, `${name}: expected one primary image and eight guide thumbnails.`);
    assert(describedImages.length === 1, `${name}: expected one described primary image.`);
    assert(emptyAltImages.length === 8, `${name}: expected eight decorative guide thumbnails.`);
    assert(html.includes(`"image":"${expectedImageUrl}"`), `${name}: JSON-LD is missing the primary image.`);
  }

  if (!isHome && !is404) {
    assert(html.includes('href="/#test"'), `${name}: missing internal link back to the test.`);
    assert(imageTags.length === 1, `${name}: expected one guide primary image.`);
    assert(describedImages.length === 1, `${name}: guide image must have descriptive alt text.`);
    assert(html.includes(`"image":"${expectedImageUrl}"`), `${name}: Article JSON-LD is missing its image.`);
  }

  if (is404) {
    assert(imageTags.length === 0, `${name}: 404 page should not render a content image.`);
  }
}

assert(htmlFiles.some((file) => file.endsWith("404.html")), "dist/404.html is missing.");

const sitemap = await readFile(join(distDir, "sitemap-index.xml"), "utf8").catch(() => "");
const sitemapXml = await readFile(join(distDir, "sitemap.xml"), "utf8").catch(() => "");
const imageSitemap = await readFile(join(distDir, "image-sitemap.xml"), "utf8").catch(() => "");
const robots = await readFile(join(distDir, "robots.txt"), "utf8").catch(() => "");

assert(sitemap.includes("sitemap-0.xml"), "sitemap-index.xml is missing sitemap-0.xml.");
assert(sitemapXml.includes("https://kinktest.xyz/sitemap-0.xml"), "sitemap.xml is missing sitemap-0.xml.");
assert(
  sitemapXml.includes("https://kinktest.xyz/image-sitemap.xml"),
  "sitemap.xml is missing image-sitemap.xml.",
);
assert(
  count(imageSitemap, /<image:image>/g) === 9,
  "image-sitemap.xml must contain 9 image entries.",
);
assert(
  count(imageSitemap, /<image:loc>https:\/\/kinktest\.xyz\/images\/[a-z0-9-]+\.svg<\/image:loc>/g) === 9,
  "image-sitemap.xml must contain 9 absolute SVG image URLs.",
);
assert(robots.includes("Sitemap: https://kinktest.xyz/sitemap.xml"), "robots.txt is missing sitemap URL.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("SEO verification passed: pages include semantic images, descriptive social alt text, JSON-LD images, and image sitemap entries.");

async function findHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findHtmlFiles(path)));
    } else if (entry.name === "index.html" || entry.name === "404.html") {
      files.push(path);
    }
  }

  return files;
}

function count(value, pattern) {
  return value.match(pattern)?.length ?? 0;
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
