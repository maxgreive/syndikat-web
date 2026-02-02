import { generate } from 'critical';
import fs from 'fs';
import path from 'path';

const siteDir = path.resolve('_site');

function getHtmlFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
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
    try {
      await generate({
        base: siteDir,
        src: file,
        target: file,
        inline: true,
        dimensions: [
          { width: 375, height: 667 },
          { width: 1366, height: 768 }
        ],
        rebase: (asset) => {
          if (asset.url.includes('../fonts/')) {
            return asset.url.replace('../fonts/', '/assets/fonts/');
          }
          return asset.url;
        },
        penthouse: { timeout: 30000 },
        extract: false,
      });
      console.log(`✅ Fixed & Inlined: ${path.relative(siteDir, file)}`);
    } catch (err) {
      console.error(`❌ Failed: ${file}`, err.message);
    }
  }
}

inlineCriticalCss().catch(console.error);