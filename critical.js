import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import penthouse from 'penthouse-esm';

const siteDir = path.resolve('_site');
const directCriticalRoutes = new Set([
  '/',
  '/about/',
  '/bagtags/',
  '/blog/',
  '/contact/',
  '/disc-dice/',
  '/events/',
  '/faq/',
  '/preisvergleich/',
  '/ratings/',
  '/register/',
  '/tools/',
  '/training/',
  '/turniere/',
]);
const sharedCriticalGroups = [
  {
    name: 'blog-posts',
    sourceRoute: '/blog/die-besten-scheiben-fuer-discgolf-einsteiger/',
    matchesRoute: (route) => route.startsWith('/blog/') && !/^\/blog\/(?:page\d+\/)?$/.test(route),
  },
];
const criticalViewports = [
  { width: 375, height: 667 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];
const stylesheet = ['normalize.css', 'style.min.css']
  .map((file) => fs.readFileSync(path.join(siteDir, 'assets/css', file), 'utf8'))
  .join('\n');

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

function filePathToRoute(file) {
  const relativePath = path.relative(siteDir, file).replace(/\\/g, '/');

  if (relativePath === 'index.html') {
    return '/';
  }

  if (relativePath === '404.html') {
    return '/404/';
  }

  if (relativePath.endsWith('/index.html')) {
    return `/${relativePath.slice(0, -'index.html'.length)}`;
  }

  return `/${relativePath.replace(/\.html$/, '')}`;
}

function inlineCssIntoFile(file, css, label) {
  if (!css) return;

  const styleTag = `<style data-critical="${label}">${css}</style>`;
  const existingTagPattern = new RegExp(`<style data-critical="${label}">[\\s\\S]*?<\\/style>\\s*`, 'g');
  const html = fs.readFileSync(file, 'utf8');

  if (!html.includes('</head>')) {
    throw new Error(`Missing </head> in ${file}`);
  }

  const nextHtml = html.replace(existingTagPattern, '').replace('</head>', `  ${styleTag}\n</head>`);
  fs.writeFileSync(file, nextHtml);
}

/**
 * Penthouse generates a stylesheet per viewport. Combining the three preserves
 * the previous mobile, desktop, and wide-screen coverage from `critical`.
 */
async function generateCriticalCss(file) {
  const url = pathToFileURL(file).href;
  const stylesheets = await Promise.all(
    criticalViewports.map(({ width, height }) =>
      penthouse({
        url,
        cssString: stylesheet,
        width,
        height,
      }),
    ),
  );
  return stylesheets.join('\n');
}

async function inlineDirectCriticalCss(htmlFiles) {
  const directFiles = htmlFiles.filter((file) => directCriticalRoutes.has(filePathToRoute(file)));

  for (const file of directFiles) {
    try {
      const css = await generateCriticalCss(file);
      inlineCssIntoFile(file, css, 'page');
      console.log(`✅ Fixed & Inlined: ${path.relative(siteDir, file)}`);
    } catch (err) {
      console.error(`❌ Failed: ${file}`, err.message);
    }
  }
}

async function inlineSharedCriticalCss(htmlFiles) {
  const filesByRoute = new Map(htmlFiles.map((file) => [filePathToRoute(file), file]));

  for (const group of sharedCriticalGroups) {
    const sourceFile = filesByRoute.get(group.sourceRoute);

    if (!sourceFile) {
      console.error(`❌ Failed: missing source route ${group.sourceRoute} for ${group.name}`);
      continue;
    }

    try {
      const css = await generateCriticalCss(sourceFile);

      const targetFiles = htmlFiles.filter((file) => group.matchesRoute(filePathToRoute(file)));

      for (const file of targetFiles) {
        inlineCssIntoFile(file, css, group.name);
        console.log(`✅ Inlined shared critical CSS (${group.name}): ${path.relative(siteDir, file)}`);
      }
    } catch (err) {
      console.error(`❌ Failed shared critical CSS (${group.name}): ${err.message}`);
    }
  }
}

async function inlineCriticalCss() {
  const htmlFiles = getHtmlFiles(siteDir);

  await inlineDirectCriticalCss(htmlFiles);
  await inlineSharedCriticalCss(htmlFiles);
}

inlineCriticalCss().catch(console.error);
