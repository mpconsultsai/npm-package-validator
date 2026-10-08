import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = path.join(root, "app", "icon.svg");
const svg = fs.readFileSync(svgPath);

const pngSizes = [
  { file: path.join(root, "public", "icon-32.png"), size: 32 },
  { file: path.join(root, "app", "icon-32.png"), size: 32 },
  { file: path.join(root, "public", "icon.png"), size: 192 },
  { file: path.join(root, "public", "icon-192.png"), size: 192 },
  { file: path.join(root, "public", "icon-512.png"), size: 512 },
  { file: path.join(root, "app", "apple-icon.png"), size: 180 },
  { file: path.join(root, "public", "apple-icon.png"), size: 180 },
];

for (const { file, size } of pngSizes) {
  await sharp(svg, { density: 512 })
    .resize(size, size)
    .png()
    .toFile(file);
  console.log(`Wrote ${path.relative(root, file)} (${size}x${size})`);
}

for (const dest of [
  path.join(root, "public", "favicon.ico"),
  path.join(root, "app", "favicon.ico"),
]) {
  fs.copyFileSync(path.join(root, "public", "icon-32.png"), dest);
  console.log(`Wrote ${path.relative(root, dest)} (from icon-32.png)`);
}
