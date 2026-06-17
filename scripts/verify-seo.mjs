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
  const hasGoogleAnalyticsTag = html.includes("https://www.googletagmanager.com/gtag/js?id=G-0WMYJDTP5G") &&
    html.includes("gtag('config', 'G-0WMYJDTP5G')");

  assert(h1Count === 1, `${name}: expected exactly one H1, found ${h1Count}.`);
  assert(/<title>[^<]+<\/title>/.test(html), `${name}: missing title.`);
  assert(/<meta name="description" content="[^"]+"/.test(html), `${name}: missing meta description.`);
  assert(/<link rel="canonical" href="https:\/\/kinktest\.xyz\/[^"]*"/.test(html), `${name}: missing canonical.`);
  assert(/<meta property="og:image" content="https:\/\/kinktest\.xyz\/og-image\.svg"/.test(html), `${name}: missing OG image.`);
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

  if (!isHome && !is404) {
    assert(html.includes('href="/#test"'), `${name}: missing internal link back to the test.`);
  }
}

assert(htmlFiles.some((file) => file.endsWith("404.html")), "dist/404.html is missing.");

const sitemap = await readFile(join(distDir, "sitemap-index.xml"), "utf8").catch(() => "");
const robots = await readFile(join(distDir, "robots.txt"), "utf8").catch(() => "");

assert(sitemap.includes("sitemap-0.xml"), "sitemap-index.xml is missing sitemap-0.xml.");
assert(robots.includes("Sitemap: https://kinktest.xyz/sitemap-index.xml"), "robots.txt is missing sitemap URL.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("SEO verification passed: built pages include H1, meta, canonical, OG image, JSON-LD, sitemap, robots, and guide-to-test links.");

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
