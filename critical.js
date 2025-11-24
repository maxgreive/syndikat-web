import { generate } from 'critical';
import fs from 'fs';
import path from 'path';

const siteDir = '_site';

function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getHtmlFiles(filePath));
    } else if (file.endsWith('.html')) {
      results.push(filePath);
    }
  });
  return results;
}

async function inlineCriticalCss() {
  const htmlFiles = getHtmlFiles(siteDir);

  for (const file of htmlFiles) {
    const relativeFile = path.relative(siteDir, file);
    await generate({
      base: siteDir,
      src: relativeFile,
      target: { html: relativeFile },
      inline: true,
      width: 375,
      height: 667,
    });
    console.log(`Inlined Critical CSS for ${relativeFile}`);
  }
}

inlineCriticalCss().catch(console.error);
