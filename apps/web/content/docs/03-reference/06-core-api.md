---
title: Core API
description: The @prudentbird/voxx-core engine — plain async functions, framework optional.
---

`@prudentbird/voxx-core` is the engine everything else is built on: the Next.js
scaffolding, the static builder, and this site. The public API is plain
async functions — Voxx is built with [Effect](https://effect.website)
internally, but you never have to touch it.

```ts
import {
  listPosts,
  getPost,
  buildNavTree,
  buildSeo,
} from "@prudentbird/voxx-core";

const { posts, total } = await listPosts({ limit: 10 }); // metadata, no rendering
const post = await getPost("getting-started/blog"); // renders just this post
const nav = buildNavTree(posts); // docs sidebar tree
const seo = buildSeo(post, await loadConfig()); // head-ready payload
```

## Content

Rendering Markdown — Shiki highlighting especially — is the expensive step, so
the engine keeps it off the listing path. `PostMeta` is everything derivable
from frontmatter and a quick scan (title, date, tags, excerpt, reading time…);
a `Post` is a `PostMeta` plus the rendered `html`, `toc`, and raw `content`.
List with metadata, render only what you show.

### `listPosts(options?)`

Returns `{ posts: PostMeta[]; total }` for a collection — docs in depth-first
tree order, blogs and changelogs newest-first — **without rendering any
Markdown**. `total` is the match count before pagination, for building page
controls. This is the scalable primitive for indexes, navigation, sitemaps,
and feeds: a collection of a million posts costs a frontmatter scan, not a
million renders. Options:

- `collection` — a [collection](/docs/reference/collections) name; defaults
  to the first
- `tag` — keep only posts whose `tags` include this value
- `category` — keep only posts whose `category` equals this value
- `offset` / `limit` — paginate the sorted, filtered set
- `includeDrafts` — override the config's draft behavior
- `cwd` / `path` — where to find `voxx.json`
- `config` — skip loading and pass a `VoxxConfig` directly

### `getPosts(options?)`

Like `listPosts`, but returns fully rendered `Post[]` (no `total`). Filtering
and pagination are applied to metadata first, so only the posts it returns are
rendered. Reach for it when you need the rendered bodies of many posts at once
— RSS, `llms-full.txt`, a single-page changelog. Accepts every `listPosts`
option.

All three renderers also accept `assetPrefix` — a string prepended to every
relative asset URL resolved during rendering. The Next.js scaffolding passes
`VOXX_ASSET_PREFIX` (`"/voxx-assets"`) here so images resolve to the catch-all
asset route; static builds leave it unset. See
[Images and assets](/docs/writing/images).

### `getPost(slug, options?)`

One rendered post by slug — for docs, the slash-joined path
(`"getting-started/blog"`); an empty string fetches a root `index.md`. It
scans the collection for the match and renders only that post. Drafts follow
the same visibility rules as `listPosts` (pass `includeDrafts: true` to preview
them); rejects with `PostNotFound` when nothing matches.

### `getPostOrNull(slug, options?)`

Like `getPost`, but resolves to `null` when no slug matches instead of
rejecting — ideal for a route that renders one post and `notFound()`s when it
is missing. Render and config failures still reject, so a genuine 404 stays
distinct from a broken post.

### `findPost(posts, slug)`

The pure lookup over a loaded list (`PostMeta[]` or `Post[]`), exported so a
data layer that already has the list can resolve slugs without re-reading
content.

### The `PostMeta` and `Post` objects

Everything is precomputed — no second pass needed. `PostMeta` covers
everything except the body; `Post` adds it:

| Group              | Fields                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Identity           | `slug`, `path[]`, `url`                                                                                       |
| Frontmatter        | `title`, `description`, `date`, `updated`, `tags`, `category`, `order`, `version`, `draft`, `image`, `author` |
| Derived            | `excerpt`, `readingTimeMinutes`                                                                               |
| Body (`Post` only) | `html` (rendered + highlighted), `toc[]`, `content` (raw markdown)                                            |

## Config

`loadConfig(options?)` loads, validates, and resolves `voxx.json` into a
complete `VoxxConfig` — every default applied, every path absolute.
`renderMarkdown(markdown, config?)` runs the rendering pipeline on a string
and returns `{ html, toc }`.

## Site outputs

| Function                                  | Returns                                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `buildNavTree(posts)`                     | Nested `NavNode[]` for a docs sidebar                                                                                 |
| `buildSeo(post, config)`                  | Canonical + Open Graph + Twitter + JSON-LD                                                                            |
| `renderRss(posts, config, opts?)`         | RSS 2.0 XML with `content:encoded`; `opts.path` sets the self-link (default `rssPath(config)` = `<basePath>/rss.xml`) |
| `renderSitemap(posts, config, opts?)`     | `sitemap.xml` XML; `opts.indexPaths` lists extra collection indexes                                                   |
| `renderRobotsTxt(config)`                 | A `robots.txt` pointing at the sitemap                                                                                |
| `renderLlmsTxt(posts, config)`            | An `llms.txt` index                                                                                                   |
| `renderLlmsTxtSections(sections, config)` | A multi-collection `llms.txt` (one heading per section)                                                               |
| `renderLlmsFull(posts, config)`           | Every page's full markdown, concatenated                                                                              |

All of them are pure functions over data you already have, so they slot
into any route handler or build script.

### `serveContentAsset(pathname, options?)`

Resolves a `/voxx-assets/…` request pathname to a file inside an `assets/`
directory of a collection's content directory and returns a ready-to-serve
`Response` — or `null` when the path isn't a servable content asset: wrong
prefix, traversal attempt (including encoded `\` separators), dotfiles,
Markdown sources regardless of case (`secret.MD` included), symlinks whose
resolved target leaves `assets/` or lands on a Markdown source, paths outside
an `assets/` directory, or a missing file. This is what the scaffolded
`voxx-assets/[...path]/route.ts` calls; you'd only touch it when building a
custom Next.js integration. Accepts `config`, `cwd`, or `path` like the
content readers — pass a cached config if you serve many assets per page,
since the route scaffolds one anyway.

Note that the `/voxx-assets` prefix assumes deployment at the domain root —
a Next.js `basePath` is not prepended to rendered asset URLs (see
[Images and assets](/docs/writing/images)).

## Helpers

The small utilities the engine uses are exported too: `slugify`,
`formatDate`, `absoluteUrl`, `joinPath`, `deriveExcerpt`,
`readingTimeMinutes`, `splitDatePrefix`, `splitOrderPrefix`, `humanize`,
`parseVersion`, and `escapeXml`.

## Telemetry

The Promise API records anonymous package telemetry unless the user has opted
out. Voxx sends one `core_used` event per process and one `core_api_call` event
per public API call. Per-call events include the API name, success/failure,
duration, content type, option flags, feature flags, and result counts where
relevant. Failed API calls and recoverable internal issues include sanitized
error tags, names, or codes.

Telemetry never includes arguments, file paths, slugs, collection names, post
names, titles, error messages, or content. Opt out with `VOXX_TELEMETRY_DISABLED=1`,
`DO_NOT_TRACK=1`, `CI=1`, or `voxx telemetry disable`.

## Dev content watcher

`registerContentWatcher(options?)` powers [live reload](/docs/getting-started/docs#live-reload)
for Next.js. Call it from `instrumentation.ts`; it watches every content
directory and `voxx.json` and bumps the generated `_voxx/content-version.ts`
module on each change, which the cached `data.ts` feeds into its `"use cache"`
key to refresh the page and invalidate the cache. Cache Components mode is what
scaffolds those version modules; the static data layer reads fresh content in
development on its own, so the watcher has nothing to bump there. It is a no-op
outside the Node.js runtime and outside development. Options:

- `versionModules` — explicit paths to bump; by default it finds every
  `_voxx/content-version.ts` under the project
- `cwd` — where to find `voxx.json` (defaults to `process.cwd()`)
- `debounceMs` — coalesce rapid edits (default `80`)

## The Effect entry point

If you _do_ speak Effect, `@prudentbird/voxx-core/effect` exposes the raw programs —
`listPostsEffect`, `getPostsEffect`, `getPostEffect`, `loadConfigEffect`,
`renderMarkdownEffect`, `parseFrontmatter` — alongside the `ConfigInput` and `Frontmatter` schemas
and the tagged errors (`ConfigError`, `InvalidFrontmatter`, `PostNotFound`,
`ContentDirMissing`, `RenderError`). Compose them into your own pipelines
and handle failures by tag instead of by message.
