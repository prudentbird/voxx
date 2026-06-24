---
title: Configuration
description: The complete voxx.json reference — every section, every default.
---

All configuration lives in one file, `voxx.json`, at the root of your
project. Only `site.title` and `site.url` are required; everything else has
a default — and several defaults are [type-aware](#type-aware-defaults).

```jsonc
{
  "$schema": "./node_modules/@voxx/core/voxx.schema.json",
  "site": {
    "title": "Acme",
    "description": "Tools for people who ship.",
    "url": "https://acme.dev",
    "author": { "name": "Acme", "url": "https://acme.dev/about" },
    "locale": "en-US",
  },
  "content": {
    "type": "docs", // "blog" | "docs" | "changelog"
    "dir": "content/docs",
    "basePath": "/docs",
    "drafts": false,
  },
  "theme": {
    "preset": "shadcn",
    "css": null,
    "codeTheme": "github-light github-dark",
  },
  "features": {
    "toc": true,
    "rss": true,
    "sitemap": true,
    "llmsTxt": true,
    "tags": true,
    "readingTime": true,
  },
  "seo": {
    "openGraph": true,
    "twitter": "@acme",
    "jsonLd": true,
    "defaultImage": "/og.png",
  },
}
```

The `$schema` line gives you autocomplete and validation in any
JSON-schema-aware editor. It's generated from the same schema that validates
the file at runtime, so the two can't drift.

## `site`

| Key           | Default   | Notes                                                      |
| ------------- | --------- | ---------------------------------------------------------- |
| `title`       | —         | **Required.** Site name in feeds, SEO, and JSON-LD         |
| `url`         | —         | **Required.** Origin for canonical URLs and absolute links |
| `description` | `""`      | Used in feeds, `llms.txt`, and index pages                 |
| `author`      | —         | `{ name, url? }` — default author for SEO output           |
| `locale`      | `"en-US"` | Open Graph locale and date formatting                      |

## `content`

The single-collection shorthand: one content type, one folder, one mount
path.

| Key        | Default          | Notes                                             |
| ---------- | ---------------- | ------------------------------------------------- |
| `type`     | `"blog"`         | `"blog"`, `"docs"`, or `"changelog"`              |
| `dir`      | `"content/blog"` | Markdown folder, resolved relative to `voxx.json` |
| `basePath` | `"/blog"`        | URL prefix the collection is mounted at           |
| `drafts`   | `false`          | Draft visibility — see below                      |

`drafts` is tri-state:

- `false` (default) — drafts are excluded everywhere.
- `true` — drafts are built and listed like published posts. Useful while
  developing, but a footgun in production; `voxx build` warns when it's set.
- `"unlisted"` — drafts are built and reachable by URL (for sharing a
  preview link), but hidden from listings, RSS, sitemap, and `llms.txt`.

To mount more than one surface, use `collections` instead — it replaces
`content` entirely. See [Collections](/docs/reference/collections).

## `features`

Each flag turns one output on or off: the "On this page" TOC, RSS, the
sitemap, `llms.txt`, tags, and reading time.

`tags` is presentation-only: it gates the tag chips on post cards (the
static builder's index page and the scaffolded blog post list) and nothing
else. RSS `<category>` elements, Open Graph article tags, and JSON-LD
keywords always flow from frontmatter
[`tags`](/docs/writing/frontmatter#field-reference), whether the flag is on
or off.

### Type-aware defaults

Defaults follow your content type, so each surface starts sensible without
any flags:

| Flag          | blog | docs    | changelog |
| ------------- | ---- | ------- | --------- |
| `toc`         | on   | on      | **off**   |
| `rss`         | on   | **off** | on        |
| `sitemap`     | on   | on      | **off**   |
| `llmsTxt`     | on   | on      | on        |
| `tags`        | on   | **off** | **off**   |
| `readingTime` | on   | **off** | **off**   |

An explicit value in `voxx.json` always wins. With multiple collections, the
defaults follow the _first_ collection's type.

## `theme` and `seo`

Covered in their own pages: [Theming](/docs/reference/theming) and
[SEO and feeds](/docs/reference/seo).

## Loading rules

`voxx.json` is resolved from the directory you run in (or `cwd`/`path`
options on the [core API](/docs/reference/core-api)). Relative `dir` paths
resolve against the config file's directory. Validation errors name the
offending field; a missing config tells you to run `voxx init`.
