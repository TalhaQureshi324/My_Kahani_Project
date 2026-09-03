// Render the True Self Me logo SVGs to HD PNGs (transparent backgrounds).
// Run: node scripts/render-logo.mjs
import sharp from "sharp";
import fs from "node:fs/promises";

const DIR = "public/images/logo";

const jobs = [
  // [src, out, width]
  ["logo-stacked.svg", "logo-stacked.png", 2048],
  ["logo-stacked-white.svg", "logo-stacked-white.png", 2048],
  ["logo-horizontal.svg", "logo-horizontal.png", 2560],
  ["logo-horizontal-white.svg", "logo-horizontal-white.png", 2560],
  ["logo-emblem.svg", "logo-emblem.png", 1024],
];

for (const [src, out, width] of jobs) {
  const svg = await fs.readFile(`${DIR}/${src}`);
  const meta = await sharp(svg).metadata();
  const height = Math.round((meta.height / meta.width) * width);
  await sharp(svg)
    .resize({ width, height, kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toFile(`${DIR}/${out}`);
  console.log(out, `${width}x${height}`);
}

// preview sheet: both stacked variants on cream + espresso tiles
const cream = { r: 247, g: 241, b: 230, alpha: 1 };
const espresso = { r: 92, g: 58, b: 38, alpha: 1 };
const stacked = await fs.readFile(`${DIR}/logo-stacked.png`);
const stackedW = await fs.readFile(`${DIR}/logo-stacked-white.png`);
const sheet = sharp({
  create: { width: 1100, height: 900, channels: 4, background: cream },
})
  .composite([
    { input: await sharp(stacked).resize(480).toBuffer(), left: 20, top: 30 },
    {
      input: await sharp({
        create: { width: 520, height: 840, channels: 4, background: espresso },
      })
        .png()
        .toBuffer(),
      left: 560,
      top: 30,
    },
    {
      input: await sharp(stackedW).resize(480).toBuffer(),
      left: 580,
      top: 40,
    },
  ])
  .png()
  .toFile(`${DIR}/.preview-sheet.png`);
await sheet;
console.log(".preview-sheet.png written");
