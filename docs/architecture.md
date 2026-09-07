# Website architecture

## Static content flow

```text
Markdown + front matter + _data -> Jekyll/Liquid layouts and includes -> _site
                                                     ^
                         assets, browser JavaScript, and Svelte bundle --------+
```

Pages at the repository root and posts in `_posts/` are Markdown-first content. Jekyll applies the layouts in `_layouts/`, reuses partials from `_includes/`, and reads structured site data from `_data/`. Site-wide configuration, plugins, permalinks, and exclusions live in `_config.yml`.

## Interactive code

Small page-specific features are conventional browser scripts in `assets/js/`: bag tags, ratings, training signups, tournament maps, and the dice game. These are appropriate where the interaction belongs to an existing Jekyll page and has no component state model.

`svelte-components/` contains the product-search application. Rollup builds it into the site assets; it streams product-search results and fetches the new-product feed. Treat its generated output as build artefacts.

## Deployment

`npm run build` first builds assets, renders Jekyll with `JEKYLL_ENV=production`, then produces critical CSS. `netlify.toml` uses that command and publishes `_site`; redirects and headers are defined there.

## API boundary

The browser selects `http://localhost:8080` on localhost and `https://api.syndikat.golf` elsewhere. Product search, tournament maps, ratings, bag tags, and training use this backend. The endpoint and payload contract is maintained in [mxlttr/syndikat-api](https://github.com/mxlttr/syndikat-api/blob/master/docs/openapi.yaml), rather than copied into this repository.
