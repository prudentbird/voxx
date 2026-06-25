# @prudentbird/voxx-core

The portable content engine behind [Voxx](https://github.com/prudentbird/voxx): point it at a folder of markdown and get SEO-ready data for a blog, a docs site, or a changelog.

```ts
import {
  listPosts,
  getPost,
  buildNavTree,
  buildSeo,
} from "@prudentbird/voxx-core";

const { posts, total } = await listPosts({ limit: 10 }); // metadata, no rendering
const post = await getPost("getting-started/install"); // renders just this post
const nav = buildNavTree(posts); // sidebar tree for docs collections
```

## What it does

- **Markdown in, structured data out** — frontmatter validation (Effect Schema), GFM + raw HTML rendering, Shiki highlighting, heading slugs/anchors, table of contents, excerpts, reading time. `.md` only — there's no MDX compiler, so `.mdx` is ignored rather than silently stripped.
- **Scales to large collections** — `listPosts` returns post metadata with `tag`/`category` filtering and `offset`/`limit` pagination **without rendering markdown**, so indexes and feeds never pay to render posts they only list. `getPost` renders just the matched post.
- **Three content types** — `blog` (flat, newest-first), `docs` (folder tree → nested URLs, `01-` order prefixes, `index.md` section pages), `changelog` (versioned releases with anchor URLs).
- **SEO out of the box** — canonical/OG/Twitter/JSON-LD via `buildSeo`, plus `renderRss`, `renderSitemap`, `renderRobotsTxt`, `renderLlmsTxt`, and `renderLlmsFull`.
- **Drafts stay private** — `draft: true` hides a post from `getPosts` _and_ `getPost` until you opt in with `includeDrafts: true` (or `drafts: true` in config).
- **Configured by `voxx.json`** — validated against the shipped `voxx.schema.json`; mount one collection via `content` or several via `collections`.

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

```ts
const docs = await getPosts({ collection: "docs" });
```

## Entry points

- `@prudentbird/voxx-core` — plain Promise API.
- `@prudentbird/voxx-core/effect` — the raw Effect programs, schemas, and tagged errors.
- `@prudentbird/voxx-core/telemetry` — the anonymous usage-telemetry engine shared with the `voxx` CLI.
- `@prudentbird/voxx-core/theme/voxx.css` — token-aware default styles (inherits shadcn design tokens when present).

Scaffolding lives in the `voxx` CLI; this package has no opinion about your framework.

## Telemetry

The engine reports a single anonymous `core_used` event the first time you call
any data function (`loadConfig`, `getPosts`, `renderMarkdown`, …) or `withVoxx`
in a process — at most one event per process. It exists so we can tell which
runtimes and versions to support; it is **anonymous, non-blocking, and
privacy-preserving**.

What is sent: a randomly generated install id, the package version, the Node
version, and the OS platform/arch. What is **never** sent: arguments, file
paths, post names, or content.

It is a no-op in published builds without an embedded project key, and it never
delays your process — events are flushed on `beforeExit`, raced against a short
timeout.

**Opt out** at any time by setting any of these environment variables to a
truthy value:

- `VOXX_TELEMETRY_DISABLED=1`
- `DO_NOT_TRACK=1`
- `CI=1` (also auto-disables in CI)

The persistent opt-out toggled by `voxx telemetry disable` is stored in
`${XDG_STATE_HOME:-~/.local/state}/voxx/telemetry.json`.
