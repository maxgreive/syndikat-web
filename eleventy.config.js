import * as yaml from 'js-yaml';
import Image from '@11ty/eleventy-img';
import path from 'node:path';
import { rewriteImages } from './scripts/site-helpers.mjs';
import { firstParagraph, markdown } from './scripts/content.mjs';

const SITE_URL = process.env.SITE_URL ?? 'https://syndikat.golf';

// Rendering pages can request many source images at once. Keep Sharp's work
// queue deliberately small so a clean production build stays within memory.
Image.concurrency = 4;

function absoluteUrl(value) {
  const url = String(value ?? '/');
  if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')) return url;
  const pathValue = url.startsWith('/') ? url : `/${url}`;
  return new URL(pathValue, SITE_URL).href;
}

function imageInputPath(source) {
  const url = String(source ?? '').trim();
  if (!url.startsWith('/assets/images/')) return null;
  return path.join('src', url);
}

function imageWidths(widths) {
  return String(widths).split(',').map(width => Number(width.trim()));
}

function postExcerpt(post) {
  const html = post?.data?.excerpt || firstParagraph(post?.templateContent);
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function imageMetadata(source, widths) {
  const inputPath = imageInputPath(source);
  if (!inputPath) return null;
  return Image(inputPath, {
    widths: imageWidths(widths),
    formats: ['webp', 'jpeg'],
    outputDir: '_site/assets/images/generated',
    urlPath: '/assets/images/generated',
  });
}

export default function (config) {
  config.setLiquidOptions({ strictFilters: true });
  config.setLibrary('md', markdown);
  config.addDataExtension('yml,yaml', contents => yaml.load(contents));
  config.addPassthroughCopy({ 'src/assets': 'assets' });
  config.addPassthroughCopy({ 'src/manifest.json': 'manifest.json' });
  config.addCollection('posts', collection => collection.getFilteredByGlob('./src/posts/**/*.md').sort((a, b) => b.date - a.date));
  config.addCollection('tagList', collection => {
    const tags = new Map();
    for (const post of collection.getFilteredByGlob('./src/posts/**/*.md').sort((a, b) => b.date - a.date)) {
      for (const tag of post.data.tags ?? []) {
        if (!tags.has(tag)) tags.set(tag, []);
        tags.get(tag).push(post);
      }
    }
    return [...tags]
      .map(([name, posts]) => ({ name, posts }))
      .sort((a, b) => b.posts[0].date - a.posts[0].date);
  });
  config.addFilter('absoluteUrl', absoluteUrl);
  config.addFilter('firstParagraph', firstParagraph);
  config.addFilter('postExcerpt', postExcerpt);
  config.addShortcode('responsiveImage', async (source, alt, sizes, widths, eager = false) => {
    if (!String(source ?? '').trim()) return '';
    const metadata = await imageMetadata(source, widths);
    if (!metadata) return `<img src="${source}" alt="${alt ?? ''}">`;
    return Image.generateHTML(metadata, {
      alt: alt ?? '',
      sizes,
      loading: eager === true || eager === 'true' ? 'eager' : 'lazy',
      decoding: 'async',
      ...(eager === true || eager === 'true' ? { fetchpriority: 'high' } : {}),
    });
  });
  config.addShortcode('responsiveImagePreload', async (source, sizes, widths, media = '') => {
    const metadata = await imageMetadata(source, widths);
    if (!metadata) return '';
    const images = metadata.jpeg;
    const srcset = images.map(image => `${image.url} ${image.width}w`).join(', ');
    const mediaAttribute = media ? ` media="${media}"` : '';
    return `<link rel="preload" fetchpriority="high"${mediaAttribute} href="${images.at(-1).url}" imagesrcset="${srcset}" imagesizes="${sizes}" as="image" type="image/jpeg">`;
  });
  config.addGlobalData('production', process.env.NODE_ENV === 'production');
  config.addGlobalData('analytics_enabled', process.env.ENABLE_ANALYTICS === 'true' || process.env.CONTEXT === 'production');
  config.addGlobalData('netlify_image_cdn_enabled', process.env.NETLIFY === 'true');
  config.addTransform('netlify-images', function (html) {
    if (!this.page.outputPath?.endsWith('.html')) return html;
    const rewritten = rewriteImages(html, process.env.NETLIFY === 'true');
    // Lazy-image templates always retain the source in data-original-src.
    // Keep src valid for crawlers, no-JS clients, and HTML validators.
    return rewritten.replace(/(<img\b[^>]*\bsrc=)["']["']([^>]*\bdata-original-src=)["']([^"']+)["']/gi, '$1"$3" $2"$3"');
  });
  return {
    dir: { input: 'src', output: '_site', includes: '_includes', layouts: '_layouts', data: '_data' },
    templateFormats: ['md', 'html', 'liquid', '11ty.js'], markdownTemplateEngine: 'liquid', htmlTemplateEngine: 'liquid'
  };
}
