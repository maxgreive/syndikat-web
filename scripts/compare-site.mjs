#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

// Compare local Eleventy output against the preserved Jekyll output.
const builtDir = process.argv[2] ?? '_site';
const referenceDir = process.argv[3] ?? '_site_jekyll';
const reportPath = process.argv[4] ?? 'reports/site-compare.txt';
const report = [];
const log = message => { report.push(message); console.log(message); };
const preview = value => {
  const text = JSON.stringify(value);
  return text.length > 320 ? `${text.slice(0, 320)}…` : text;
};

function values(html, pattern) {
  return [...html.matchAll(pattern)].map(match => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
}

function inspect(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const normalizedBody = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const jsonLd = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => { try { return JSON.parse(match[1]); } catch { return match[1].replace(/\s+/g, ' ').trim(); } });
  return {
    head: head.replace(/\s+/g, ' ').trim(),
    bodyText: normalizedBody,
    links: [...html.matchAll(/<a\b[^>]+href=["']([^"']+)["']/gi)].map(match => match[1]),
    jsonLd,
    title: values(html, /<title[^>]*>([\s\S]*?)<\/title>/gi),
    canonical: values(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/gi),
    headings: values(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi),
    emptySrc: (html.match(/<img\b[^>]*\bsrc=["']["']/gi) ?? []).length,
    emptyDataSrc: (html.match(/<img\b[^>]*\bdata-src=["']["']/gi) ?? []).length,
  };
}

function routeFor(file) {
  const relative = file.replaceAll(path.sep, '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

async function htmlFiles(directory) {
  return (await fs.readdir(directory, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
  .map(entry => path.relative(directory, entry.parentPath ? path.join(entry.parentPath, entry.name) : entry.name));
}

const [builtFiles, referenceFiles] = await Promise.all([htmlFiles(builtDir), htmlFiles(referenceDir)]);
const files = [...new Set([...builtFiles, ...referenceFiles])].sort();

let failures = 0;
for (const file of files.sort()) {
  const route = routeFor(file);
  const builtHtml = builtFiles.includes(file) ? await fs.readFile(path.join(builtDir, file), 'utf8') : null;
  const referenceHtml = referenceFiles.includes(file) ? await fs.readFile(path.join(referenceDir, file), 'utf8') : null;
  if (!builtHtml || !referenceHtml) {
    failures += 1;
    log(`DIFF ${route}: ${builtHtml ? 'missing reference' : 'missing Eleventy output'}`);
    continue;
  }
  const reference = inspect(referenceHtml);
  const built = inspect(builtHtml);
  const differences = Object.keys(reference).filter(key => JSON.stringify(reference[key]) !== JSON.stringify(built[key]));
  if (differences.length) {
      failures += 1;
    log(`DIFF ${route}: ${differences.join(', ')}`);
    for (const key of differences) {
      const left = reference[key];
      const right = built[key];
      if (Array.isArray(left) && Array.isArray(right)) {
        const added = right.filter(item => !left.some(value => JSON.stringify(value) === JSON.stringify(item)));
        const removed = left.filter(item => !right.some(value => JSON.stringify(value) === JSON.stringify(item)));
        log(`  ${key}: ${left.length} reference items, ${right.length} built items`);
        if (removed.length) log(`    removed: ${preview(removed)}`);
        if (added.length) log(`    added: ${preview(added)}`);
      } else {
        log(`  ${key}:`);
        log(`    reference: ${preview(left)}`);
        log(`    built:     ${preview(right)}`);
      }
    }
  } else log(`PASS ${route}`);
}

log(`\nCompared ${files.length} HTML files: ${files.length - failures} passed, ${failures} failed.`);
await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${report.join('\n')}\n`);
console.log(`Report written to ${reportPath}`);
process.exitCode = failures ? 1 : 0;
