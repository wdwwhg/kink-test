import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

const guides = [
  {
    slug: "what-is-a-kink-test",
    alt: "Reflection map connecting adult preferences, personal boundaries, and consent-first conversation prompts.",
  },
  {
    slug: "kink-test-vs-bdsm-test",
    alt: "Side-by-side diagrams comparing broad kink test themes with more specific BDSM roles and vocabulary.",
  },
  {
    slug: "how-to-read-results",
    alt: "Kink test radar chart annotated with strongest themes, lower priorities, boundaries, and conversation notes.",
  },
  {
    slug: "talking-with-your-partner",
    alt: "Two overlapping speech bubbles organizing kink test themes into curious, not now, and off-limits.",
  },
  {
    slug: "consent-and-boundaries",
    alt: "Consent choices—yes, no, slow down, pause, and stop—shown inside clear personal boundary lines.",
  },
  {
    slug: "online-kink-test-privacy",
    alt: "Browser-based kink test scoring locally beside a privacy lock, no-account symbol, and no-upload arrow.",
  },
  {
    slug: "beginner-friendly-kink-terms",
    alt: "Glossary cards for consent, boundaries, negotiation, roles, check-ins, and aftercare.",
  },
  {
    slug: "aftercare-basics",
    alt: "Four-part aftercare illustration showing reassurance, space, reflection, and repair after a vulnerable conversation.",
  },
];

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("semantic image system", () => {
  test("defines unique image metadata for every guide", () => {
    for (const guide of guides) {
      const markdown = read(`src/content/guides/${guide.slug}.md`);

      expect(markdown).toContain(`src: "/images/${guide.slug}.svg"`);
      expect(markdown).toContain(`socialSrc: "/images/${guide.slug}.png"`);
      expect(markdown).toContain(`alt: "${guide.alt}"`);
    }
  });

  test("ships matching SVG and PNG assets for home and every guide", () => {
    const slugs = ["home-reflection-map", ...guides.map((guide) => guide.slug)];

    for (const slug of slugs) {
      expect(existsSync(join(root, `public/images/${slug}.svg`))).toBe(true);
      expect(existsSync(join(root, `public/images/${slug}.png`))).toBe(true);
    }
  });

  test("adds accessible image metadata and fixed dimensions to the layout", () => {
    const layout = read("src/layouts/BaseLayout.astro");

    expect(layout).toContain("imageAlt: string");
    expect(layout).toContain('property="og:image:alt"');
    expect(layout).toContain('name="twitter:image:alt"');
    expect(layout).toContain('property="og:image:width" content="1200"');
    expect(layout).toContain('property="og:image:height" content="630"');
    expect(layout).toContain('property="og:image:type" content="image/png"');
  });

  test("renders semantic primary images and decorative guide thumbnails", () => {
    const homepage = read("src/pages/index.astro");
    const guidePage = read("src/pages/guides/[slug].astro");

    expect(homepage).toContain("<ContentImage");
    expect(homepage).toContain('alt=""');
    expect(guidePage).toContain("<ContentImage");
    expect(guidePage).toContain("alt={entry.data.image.alt}");
  });

  test("publishes an image sitemap and includes it in the sitemap index", () => {
    expect(existsSync(join(root, "src/pages/image-sitemap.xml.ts"))).toBe(true);
    expect(read("src/pages/sitemap.xml.ts")).toContain(
      "https://kinktest.xyz/image-sitemap.xml",
    );
  });

  test("updates the radar chart description with all six result scores", () => {
    const quiz = read("src/components/Quiz.astro");

    expect(quiz).toContain('const radarDescription = root?.querySelector<SVGDescElement>("[data-radar-description]")');
    expect(quiz).toContain("radarDescription.textContent");
    expect(quiz).toContain('result.scores.map((score) => `${score.label}: ${score.score} out of 100`)');
  });

  test("provides explicit image generation and synchronization commands", () => {
    const packageJson = JSON.parse(read("package.json"));

    expect(packageJson.scripts["images:generate"]).toBe("node scripts/generate-images.mjs");
    expect(packageJson.scripts["images:check"]).toBe("node scripts/check-images.mjs");
    expect(packageJson.devDependencies.sharp).toBeTruthy();
    expect(existsSync(join(root, "scripts/generate-images.mjs"))).toBe(true);
    expect(existsSync(join(root, "scripts/check-images.mjs"))).toBe(true);
  });

  test("extends SEO and browser verification to cover image accessibility", () => {
    const seo = read("scripts/verify-seo.mjs");
    const browser = read("scripts/verify-browser.mjs");

    expect(seo).toContain('meta property="og:image:alt"');
    expect(seo).toContain('meta name="twitter:image:alt"');
    expect(seo).toContain('image-sitemap.xml');
    expect(seo).toContain('count(imageSitemap, /<image:image>/g) === 9');
    expect(browser).toContain("missingAltImages");
    expect(browser).toContain("emptyAltImages");
    expect(browser).toContain("brokenImages");
    expect(browser).toContain("radarDescription");
    expect(browser).toContain("/guides/what-is-a-kink-test/");
  });
});
