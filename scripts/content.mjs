import fs from 'node:fs';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';
import anchor from 'markdown-it-anchor';

const sourceCache = new Map();

export function slug(value) {
  return String(value ?? '').trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
}

export function firstParagraph(html) {
  const match = String(html ?? '').match(/<p\b[^>]*>[\s\S]*?<\/p>/i);
  return match?.[0] ?? '';
}

export const markdown = new MarkdownIt({ html: true, linkify: true, typographer: true })
  .use(attrs)
  .use(anchor, { slugify: slug });

export function excerptFromSource(inputPath) {
  let source = sourceCache.get(inputPath);
  if (!source) {
    source = matter(fs.readFileSync(inputPath, 'utf8')).content;
    sourceCache.set(inputPath, source);
  }
  return markdown.render(source.trimStart().split(/\n\s*\n/)[0]);
}
