# Website architecture

## Static content flow

```text
src/ Markdown + front matter + _data -> Eleventy/Liquid layouts and includes -> _site
                                                     ^
                         assets, browser JavaScript, and Svelte bundle --------+
```

Pages in `src/` and posts in `src/posts/` are Markdown-first content. Eleventy applies explicitly named `.html` layouts in `src/_layouts/`, reuses partials from `src/_includes/`, and reads structured site data from `src/_data/`. Site-wide configuration, computed data, filters, permalinks, and exclusions live in `eleventy.config.js`.

## Interactive code

Small page-specific features are conventional browser scripts in `src/assets/js/`: bag tags, ratings, training signups, tournament maps, the dice game, and local post search. Search fetches the Eleventy-generated `/search.json` once and matches normalized post title, tag, and rendered text. These are appropriate where the interaction belongs to an existing Eleventy page and has no component state model.

The `responsiveImage` Eleventy shortcode turns a source under `src/assets/images/` into build-time WebP variants and JPEG fallbacks in `_site/assets/images/generated/`, with a `<picture>` element, `srcset`, `sizes`, and intrinsic dimensions. Templates keep only the original source path.

`svelte-components/` contains the product-search application. Rollup builds it into the site assets; it streams product-search results and fetches the new-product feed. Treat its generated output as build artefacts.

## Deployment

`npm run build` first builds assets, renders Eleventy with `NODE_ENV=production`, then produces critical CSS. `netlify.toml` uses that command and publishes `_site`; redirects and headers are defined there.

## API boundary

The browser selects `http://localhost:8080` on localhost and `https://api.syndikat.golf` elsewhere. Product search, tournament maps, ratings, bag tags, and training use this backend. The endpoint and payload contract is maintained in [mxlttr/syndikat-api](https://github.com/mxlttr/syndikat-api/blob/master/docs/openapi.yaml), rather than copied into this repository.
