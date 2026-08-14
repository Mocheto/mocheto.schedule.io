import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const sheets = process.argv.slice(2);
if (sheets.length !== 9) {
  console.error("Uso: node scripts/build-recipe-assets.mjs <lamina-1.png> ... <lamina-9.png>");
  process.exit(1);
}

const source = readFileSync(resolve("app/page.tsx"), "utf8");
const start = source.indexOf("const meals = [");
const end = source.indexOf("\n\nconst menuWeekIndexes", start);
const literal = source.slice(start, end).replace(/^const meals = /, "").replace(/;\s*$/, "");
const meals = Function(`"use strict"; return (${literal});`)();
const dishes = [...new Set(meals.flatMap((day) => day.options.flat()))];
const outputDir = resolve("public/recipes/dishes");
mkdirSync(outputDir, { recursive: true });

const slug = (name) => `dish-${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

dishes.forEach((dish, index) => {
  const sheetIndex = Math.floor(index / 12);
  const tileIndex = index % 12;
  const columns = 4;
  const rows = sheetIndex === 8 ? 2 : 3;
  const dimensions = execFileSync("identify", ["-format", "%w %h", sheets[sheetIndex]], { encoding: "utf8" }).trim().split(" ").map(Number);
  const [width, height] = dimensions;
  const column = tileIndex % columns;
  const row = Math.floor(tileIndex / columns);
  const x0 = Math.round(column * width / columns);
  const x1 = Math.round((column + 1) * width / columns);
  const y0 = Math.round(row * height / rows);
  const y1 = Math.round((row + 1) * height / rows);
  execFileSync("magick", [sheets[sheetIndex], "-crop", `${x1 - x0}x${y1 - y0}+${x0}+${y0}`, "+repage", "-resize", "480x480^", "-gravity", "center", "-extent", "480x480", "-strip", "-quality", "78", `${outputDir}/${slug(dish)}.webp`]);
});

console.log(`${dishes.length} assets creados en ${outputDir}`);
