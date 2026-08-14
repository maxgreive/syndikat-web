# Agent guidance

- Keep editorial pages and posts as Markdown with front matter. Use `_layouts`, `_includes`, and `_data` before adding page-specific markup or duplicated configuration.
- Plain browser JavaScript belongs in `assets/js/`; Svelte is for the product-search interface in `svelte-components/`. Do not hand-edit generated Svelte bundles or built `_site` output.
- Run `npm run build:assets` after Svelte/CSS changes and `npm run build` before submitting site changes. The latter also verifies the Jekyll production build.
- `netlify.toml` defines the deployment command and publish directory. Keep changes compatible with that build shape.
- Browser calls default to the local or production API host. For endpoint or payload changes, update the consumer, the contract in [maxgreive/syndikat-api](https://github.com/maxgreive/syndikat-api/blob/master/docs/openapi.yaml), and both repositories' documentation together.
- Do not put API secrets or production credentials in source, content, data files, or docs.
