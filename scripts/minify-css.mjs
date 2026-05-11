import CleanCSS from "clean-css";
import { readFile, writeFile } from "node:fs/promises";

const inputPath = "assets/css/style.css";
const outputPath = "assets/css/style.min.css";

const css = await readFile(inputPath, "utf8");
const result = new CleanCSS({ level: 2 }).minify(css);

if (result.errors.length > 0) {
  for (const error of result.errors) console.error(error);
  process.exit(1);
}

for (const warning of result.warnings) console.warn(warning);

await writeFile(outputPath, result.styles);
console.log(`Minified ${inputPath} -> ${outputPath}`);
