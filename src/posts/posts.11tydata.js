import { excerptFromSource } from '../../scripts/content.mjs';

export default {
  layout: 'post.html',
  eleventyComputed: {
    excerpt: data => data.excerpt ?? excerptFromSource(data.page.inputPath),
    description: data => data.description ?? excerptFromSource(data.page.inputPath),
    authorData: data => data.author ? data.people?.[data.author] : undefined,
    authorsData: data => (data.authors ?? []).map(id => data.people?.[id]).filter(Boolean),
    permalink: data => data.permalink || `/blog/${data.page.fileSlug}/`,
  },
};
