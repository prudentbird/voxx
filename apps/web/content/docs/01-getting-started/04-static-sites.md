---
title: Static sites
description: No framework? Render a self-contained site with one command.
---

Voxx doesn't require Next.js — or any framework. `voxx build` renders your
whole collection to plain HTML and CSS:

```bash
npx @prudentbird/voxx init          # choose "static site" when asked
npx @prudentbird/voxx build         # -> dist/
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
non-Markdown files below an `assets/` directory in your content folder are
copied through. Dot-files and dot-directories at any depth are excluded,
and symlink targets must stay inside the collection and satisfy the same
asset rules. Relative references like `![diagram](./assets/diagram.png)`
are resolved to where they land (see [Images and assets](/docs/writing/images)). Multi-collection
configs build every collection in one pass.

```bash
npx @prudentbird/voxx build --out public    # somewhere other than ./dist
npx @prudentbird/voxx build --drafts        # include draft pages
```

Preview locally with the built-in dev server — it rebuilds on change and
includes drafts by default:

```bash
npx @prudentbird/voxx dev                   # http://localhost:4321
```

Or serve the built folder with a static HTTP server that serves `index.html`
for directory URLs:

```bash
npx serve dist
```

Open the server's URL in your browser, followed by your collection's base path
(for example, `http://localhost:3000/blog/`). Opening `dist/blog/index.html`
directly over `file://` is not supported: internal links use directory URLs
that need an HTTP server to resolve them to `index.html`.

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
