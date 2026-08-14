# Website development

## Setup

Use Node.js 22.18 or newer (the critical-CSS generator requires it), then install the Node and Ruby dependencies:

```sh
npm install
bundle install
```

Start both development processes with `npm run dev`. Use `npm run dev:jekyll` or `npm run dev:svelte` when working on only one side.

## Build pipeline

- `npm run build:svelte` delegates to `svelte-components/` and bundles the product-search UI.
- `npm run build:css` minifies CSS.
- `npm run build:assets` runs both asset tasks in parallel.
- `npm run build:jekyll` renders the production static site.
- `npm run build` runs assets, Jekyll, and critical-CSS generation in sequence. This is Netlify's build command.
- `npm run audit:a11y` checks representative live pages against WCAG 2.0 AA using Pa11y and saves the JSON review to `reports/pa11y.json`. Set `PA11Y_BASE_URL` to test a deployed preview, for example `PA11Y_BASE_URL=https://deploy-preview-123--syndikat.netlify.app npm run audit:a11y`.

## Content authoring

Create regular pages as root-level Markdown files with front matter and posts as dated files in `_posts/`. Reuse an existing layout where possible. Put repeatable structured content in `_data/` and shared markup in `_includes/`; avoid embedding credentials or environment-specific API values in content.

Images and other static files belong under `assets/`. Check responsive image and image-CDN behavior before adding very large assets. Editing `_config.yml` requires restarting Jekyll because it is not reloaded by `jekyll serve`.

## API configuration

Browser code currently chooses `http://localhost:8080` for `localhost`/`127.0.0.1` and `https://api.syndikat.golf` otherwise. The Svelte build additionally accepts `API_URL` at build time. The consumed features are:

- bag-tag rankings and ratings;
- official and Metrix tournament lists plus route planning;
- product feed and product-search SSE stream;
- training status, participant listing, signup, and removal.

Read the API schemas in [maxgreive/syndikat-api](https://github.com/maxgreive/syndikat-api/blob/master/docs/openapi.yaml) before changing a request or response assumption.
