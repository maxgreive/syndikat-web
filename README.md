# syndikat-web

The Jekyll-based public website for Syndikat Disc Golf Cologne. It combines Markdown content and Liquid layouts with small browser JavaScript tools and a Svelte product-search bundle.

## Architecture

Jekyll renders pages, posts, layouts, includes, and `_data` into the static site. JavaScript powers interactive pages such as ratings, bag tags, training signups, and the tournament map. Svelte is reserved for the product search. See [architecture](docs/architecture.md) and [development](docs/development.md).

## Prerequisites

- Node.js 22.18 or newer and npm
- Ruby and Bundler (versions locked by `Gemfile.lock`)

## Setup and commands

```sh
npm install
bundle install
npm run dev
```

`npm run dev` starts Jekyll and the Svelte development build. For a production-equivalent build:

```sh
npm run build:assets
npm run build
```

The full build runs Svelte and CSS asset builds, Jekyll production rendering, and critical-CSS generation. Netlify runs `npm run build` and publishes `_site`.

When changing a website API call, coordinate the implementation and [API contract](https://github.com/mxlttr/syndikat-api/blob/master/docs/openapi.yaml) in `mxlttr/syndikat-api`.
