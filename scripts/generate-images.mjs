import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";

const imageDir = join(process.cwd(), "public", "images");
const files = (await readdir(imageDir))
  .filter((file) => extname(file) === ".svg")
  .sort();

for (const file of files) {
  const source = join(imageDir, file);
  const output = join(imageDir, file.replace(/\.svg$/, ".png"));

  await sharp(source, { density: 144 })
    .resize(1200, 630, { fit: "fill" })
    .png({ compressionLevel: 9, palette: false })
    .toFile(output);

  console.log(`Generated ${file.replace(/\.svg$/, ".png")}`);
}
