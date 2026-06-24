---
title: Collections
description: Mount a blog, docs, and changelog together on one site.
---

One site often needs more than one surface — product docs next to a blog
next to release notes. `collections` mounts several folders at once, each
with its own type, directory, and base path:

```jsonc
{
  "site": { "title": "Acme", "url": "https://acme.dev" },
  "collections": [
    { "name": "blog" },
    { "name": "docs", "type": "docs" },
    { "name": "releases", "type": "changelog", "basePath": "/changelog" },
  ],
}
```

When `collections` is present it replaces the `content` block entirely.

## Per-collection defaults

Each entry fills itself in from its `name` and `type`:

| Key        | Default          | Example above              |
| ---------- | ---------------- | -------------------------- |
| `name`     | the `type`       | `"releases"`               |
| `type`     | `"blog"`         | `"changelog"`              |
| `dir`      | `content/<name>` | `content/releases`         |
| `basePath` | `/<name>`        | overridden to `/changelog` |
| `drafts`   | `false`          | —                          |

`drafts` is per-collection and tri-state — `false`, `true`, or `"unlisted"`
(built and reachable by URL but hidden from listings and feeds). See
[`content.drafts`](/docs/reference/configuration#content) for the full
breakdown.

So `{ "name": "docs", "type": "docs" }` reads `content/docs/` and mounts at
`/docs` with zero further config.

## The first collection is the default

The first entry backs the single-collection API: `getPosts()` with no
arguments reads it, and the type-aware
[feature defaults](/docs/reference/configuration#type-aware-defaults) follow
its type. Reach the others by name:

```ts
import { getPosts, getPost } from "@prudentbird/voxx-core";

const posts = await getPosts(); // first collection
const docs = await getPosts({ collection: "docs" }); // by name
const page = await getPost("guides/deploy", { collection: "docs" });
```

Asking for a name that isn't defined fails with a message listing the
collections that are.

## Routes per collection

Each collection is its own surface, so each gets its own routes. Run
`voxx init` once per surface with matching `--base` flags, or hand-wire
extra routes against the core API — the scaffolded files are small and make
a good template. Feeds are per-surface too: pass the right collection's
posts to `renderRss` or `renderLlmsTxt` and mount the route where it
belongs (`/blog/rss.xml`, `/changelog/rss.xml`, …).

For static sites, [`voxx build`](/docs/reference/cli#voxx-build) handles
all of this itself: it renders every collection, writes a feed per blog or
changelog surface under its base path, and emits one combined
`sitemap.xml`, `robots.txt`, and sectioned `llms.txt` at the root.
