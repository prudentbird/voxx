---
title: Static sites
description: No framework? Render a self-contained site with one command.
---

Voxx doesn't require Next.js — or any framework. `voxx build` renders your
whole collection to plain HTML and CSS:

```bash
npx voxx init          # choose "static site" when asked
npx voxx build         # -> dist/
```

The output depends on your content type:

- **Blog** — an index page plus one page per post
- **Docs** — every page with the sidebar, pager, and TOC baked in; if there's
  no root `index.md`, Voxx emits a landing page so the base path isn't a 404
- **Changelog** — the release timeline on a single page

Alongside the pages you get `rss.xml`, `sitemap.xml`, `robots.txt`,
`llms.txt`, and `llms-full.txt`, following the same
[feature flags](/docs/reference/configuration#features) as everything
else, plus the Voxx stylesheet under `dist/_voxx/`. Images and other
non-markdown files in your content folder are copied through, and relative
references like `![diagram](./diagram.png)` are resolved to where they
land. Multi-collection configs build every collection in one pass.

```bash
npx voxx build --out public    # somewhere other than ./dist
npx voxx build --drafts        # include draft pages
```

Preview locally with the built-in dev server — it rebuilds on change and
includes drafts by default:

```bash
npx voxx dev                   # http://localhost:4321
```

Or serve the built folder with anything that can serve files:

```bash
npx serve dist
```

## Bring your own framework

The static builder and the Next.js scaffolding are both thin layers over
[`@prudentbird/voxx-core`](/docs/reference/core-api), whose public API is plain async
functions:

```ts
import { getPosts, buildSeo, renderRss } from "@prudentbird/voxx-core";

const posts = await getPosts(); // reads voxx.json, returns Post[]
```

If you're on Astro, Remix, SvelteKit, or a hand-rolled build script, call
the engine directly — every `Post` carries rendered HTML, a TOC, SEO-ready
fields, and its final URL.
