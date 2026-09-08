export function rewriteImages(html, enabled) {
  if (!enabled) return html;
  return html.replace(/<img\b[^>]*>/gi, tag => {
    const match = tag.match(/\bsrc=(["'])([^"']+)\1/i);
    if (!match || !/^\/assets\/images\/.*\.(jpg|jpeg|png|webp|avif)(?:\?.*)?$/i.test(match[2])) return tag;
    const src = match[2];
    const url = `/.netlify/images?url=${encodeURIComponent(src)}&q=70`;
    let result = tag.replace(match[0], `src="${url}"`);
    const attributes = { 'data-original-src': src,
      srcset: [480, 760, 960, 1200, 1600].map(width => `${url}&w=${width} ${width}w`).join(', '),
      sizes: '(min-width: 792px) 760px, calc(100vw - 40px)', loading: 'lazy', decoding: 'async' };
    for (const [name, value] of Object.entries(attributes)) {
      if (!new RegExp(`\\s${name}\\s*=`, 'i').test(result)) result = result.replace(/<img/i, `<img ${name}="${value}"`);
    }
    return result;
  });
}
