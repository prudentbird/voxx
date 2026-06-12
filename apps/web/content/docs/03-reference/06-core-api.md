---
title: Core API
description: The @voxx/core engine — plain async functions, framework optional.
---

`@voxx/core` is the engine everything else is built on: the Next.js
scaffolding, the static builder, and this site. The public API is plain
async functions — Voxx is built with [Effect](https://effect.website)
internally, but you never have to touch it.

```ts
import { getPosts, getPost, buildNavTree, buildSeo } from "@voxx/core";

const posts = await getPosts();                  // reads voxx.json
const post = await getPost("getting-started/blog");
const nav = buildNavTree(posts);                 // docs sidebar tree
const seo = buildSeo(post, await loadConfig());  // head-ready payload
```

## Content

### `getPosts(options?)`

Returns every `Post` in a collection — docs in depth-first tree order,
blogs and changelogs newest-first. Options:

- `collection` — a [collection](/docs/reference/collections) name; defaults
  to the first
- `includeDrafts` — override the config's draft behavior
- `cwd` / `path` — where to find `voxx.json`
- `config` — skip loading and pass a `VoxxConfig` directly

### `getPost(slug, options?)`

One post by slug — for docs, the slash-joined path
(`"getting-started/blog"`); an empty string fetches a root `index.md`.
Drafts follow the same visibility rules as `getPosts` (pass
`includeDrafts: true` to preview them); rejects with `PostNotFound` when
nothing matches.

### `findPost(posts, slug)`

The pure lookup `getPost` uses, exported so a data layer that already has
the post list (cached, say) can resolve slugs without re-reading content.

### The `Post` object

Everything is precomputed — no second pass needed:

| Group | Fields |
| --- | --- |
| Identity | `slug`, `path[]`, `url` |
| Frontmatter | `title`, `description`, `date`, `updated`, `tags`, `category`, `order`, `version`, `draft`, `image`, `author` |
| Derived | `excerpt`, `readingTimeMinutes`, `toc[]` |
| Body | `html` (rendered + highlighted), `content` (raw markdown) |

## Config

`loadConfig(options?)` loads, validates, and resolves `voxx.json` into a
complete `VoxxConfig` — every default applied, every path absolute.
`renderMarkdown(markdown, config?)` runs the rendering pipeline on a string
and returns `{ html, toc }`.

## Site outputs

| Function | Returns |
| --- | --- |
| `buildNavTree(posts)` | Nested `NavNode[]` for a docs sidebar |
| `buildSeo(post, config)` | Canonical + Open Graph + Twitter + JSON-LD |
| `renderRss(posts, config, opts?)` | RSS 2.0 XML with `content:encoded`; `opts.path` sets the self-link (default `rssPath(config)` = `<basePath>/rss.xml`) |
| `renderSitemap(posts, config, opts?)` | `sitemap.xml` XML; `opts.indexPaths` lists extra collection indexes |
| `renderRobotsTxt(config)` | A `robots.txt` pointing at the sitemap |
| `renderLlmsTxt(posts, config)` | An `llms.txt` index |
| `renderLlmsTxtSections(sections, config)` | A multi-collection `llms.txt` (one heading per section) |
| `renderLlmsFull(posts, config)` | Every page's full markdown, concatenated |

All of them are pure functions over data you already have, so they slot
into any route handler or build script.

## Helpers

The small utilities the engine uses are exported too: `slugify`,
`formatDate`, `absoluteUrl`, `joinPath`, `deriveExcerpt`,
`readingTimeMinutes`, `splitDatePrefix`, `splitOrderPrefix`, `humanize`,
`parseVersion`, and `escapeXml`.

## The Effect entry point

If you *do* speak Effect, `@voxx/core/effect` exposes the raw programs —
`getPostsEffect`, `loadConfigEffect`, `renderMarkdownEffect`,
`parseFrontmatter` — alongside the `ConfigInput` and `Frontmatter` schemas
and the tagged errors (`ConfigError`, `InvalidFrontmatter`, `PostNotFound`,
`ContentDirMissing`, `RenderError`). Compose them into your own pipelines
and handle failures by tag instead of by message.
