import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";

const imageDir = join(process.cwd(), "public", "images");
const files = (await readdir(imageDir))
  .filter((file) => extname(file) === ".svg")
  .sort();
const failures = [];

if (files.length !== 9) {
  failures.push(`Expected 9 SVG source images, found ${files.length}.`);
}

for (const file of files) {
  const svgPath = join(imageDir, file);
  const pngPath = join(imageDir, file.replace(/\.svg$/, ".png"));
  const svg = await readFile(svgPath, "utf8");

  if (!svg.includes('width="1200"') || !svg.includes('height="630"')) {
    failures.push(`${file}: SVG must declare 1200x630 dimensions.`);
  }

  const expected = await sharp(svgPath, { density: 144 })
    .resize(1200, 630, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const actualImage = sharp(pngPath);
  const metadata = await actualImage.metadata().catch(() => null);
  const actual = await actualImage.ensureAlpha().raw().toBuffer().catch(() => null);

  if (!metadata || !actual) {
    failures.push(`${file}: matching PNG is missing or unreadable.`);
    continue;
  }
  if (metadata.width !== 1200 || metadata.height !== 630 || metadata.format !== "png") {
    failures.push(`${file}: matching PNG must be a 1200x630 PNG.`);
  }
  if (!expected.equals(actual)) {
    failures.push(`${file}: PNG pixels are out of sync with the SVG source.`);
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Image verification passed: 9 SVG sources have synchronized 1200x630 PNG previews.");
