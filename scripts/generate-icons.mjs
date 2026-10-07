import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = path.join(root, "app", "icon.svg");
const svg = fs.readFileSync(svgPath);

const pngSizes = [
  { file: path.join(root, "public", "icon.png"), size: 192 },
  { file: path.join(root, "public", "icon-192.png"), size: 192 },
  { file: path.join(root, "public", "icon-512.png"), size: 512 },
  { file: path.join(root, "app", "apple-icon.png"), size: 180 },
  { file: path.join(root, "public", "apple-icon.png"), size: 180 },
];

fs.copyFileSync(svgPath, path.join(root, "public", "icon.svg"));
console.log("Wrote public/icon.svg");

for (const { file, size } of pngSizes) {
  await sharp(svg, { density: 512 })
    .resize(size, size)
    .png()
    .toFile(file);
  console.log(`Wrote ${path.relative(root, file)} (${size}x${size})`);
}
