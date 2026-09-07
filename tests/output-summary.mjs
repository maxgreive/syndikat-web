import { parseHTML } from 'linkedom';

export function summarize(html) {
  const { document } = parseHTML(html);
  const all = selector => [...document.querySelectorAll(selector)];
  const content = selector => document.querySelector(selector)?.getAttribute('content') || '';
  const schema = all('script[type="application/ld+json"]').flatMap(el => JSON.parse(el.textContent)['@graph']);
  return {
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    description: content('meta[name="description"]'),
    robots: content('meta[name="robots"]'),
    schemaTypes: schema.map(item => item['@type']),
    authors: schema.find(item => item['@type'] === 'BlogPosting')?.author || [],
    headings: all('h1').map(el => el.textContent.trim()),
    cards: all('.article__title a').map(el => el.getAttribute('href')),
    pagination: all('.pagination a').map(el => el.getAttribute('href')),
    scripts: all('script[src]').map(el => el.getAttribute('src')).filter(src => !src.includes('stats.syndikat.golf') && !src.includes('11ty')),
  };
}
