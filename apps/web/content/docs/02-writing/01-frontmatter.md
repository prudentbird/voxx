---
title: Frontmatter
description: Every field Voxx reads, and what it derives when you leave one out.
---

Frontmatter is the YAML block between `---` fences at the top of a file.
Only `title` is required — everything else is optional, validated, and
falls back to something sensible.

```yaml
---
title: Hello, world
description: An optional summary used for SEO and excerpts.
date: 2026-06-10
updated: 2026-06-11
slug: hello-world
tags: [css, ui]
category: Craft
order: 2
version: "1.4.0"
draft: false
image: /og/hello.png
author: { name: Jane Doe, url: https://jane.example }
excerpt: A hand-written excerpt, if the derived one won't do.
---
```

## Field reference

| Field         | Type     | Notes                                                                                     |
| ------------- | -------- | ----------------------------------------------------------------------------------------- |
| `title`       | string   | **Required.** The page heading and `<title>`                                              |
| `description` | string   | Used for SEO and list excerpts                                                            |
| `date`        | date     | Publish date — see [precedence](#how-dates-are-resolved)                                  |
| `updated`     | date     | Shown as modified time in SEO output and sitemaps                                         |
| `slug`        | string   | Overrides the filename-derived slug                                                       |
| `tags`        | string[] | Blog taxonomy; flows into RSS categories and SEO keywords                                 |
| `category`    | string   | Passthrough: exposed on `Post` for your own components; no built-in Voxx surface reads it |
| `order`       | number   | Manual position in docs navigation                                                        |
| `version`     | string   | Release version (changelog) — overrides the filename                                      |
| `draft`       | boolean  | Hidden everywhere until published (default `false`)                                       |
| `image`       | string   | Social/OG image; falls back to `seo.defaultImage`                                         |
| `author`      | author   | One or more authors — see [Authors](#authors). Overrides `site.author` for this page      |
| `excerpt`     | string   | Overrides the derived excerpt                                                             |

Unknown keys are ignored, not errors — annotate your files however you like.
An empty value (`description:` with nothing after it) is treated as absent.
Invalid values fail loudly with the file's name in the message.

## How dates are resolved

Voxx tries three sources, in order:

1. `date:` in frontmatter
2. A `YYYY-MM-DD-` filename prefix (`2026-06-10-hello.md`)
3. The file's creation time on disk

So a blog can be nothing but date-prefixed files with `title:` — Voxx fills
in the rest.

## Authors

`author` accepts a bare name, an object with an optional `url`, or a list
mixing both:

```yaml
author: Jane Doe
# or
author: { name: Jane Doe, url: https://jane.example }
# or several
author:
  - { name: Jane Doe, url: https://jane.example }
  - Sam Rivera
```

Each author renders as a byline on the post (names with a `url` become
links) and flows into Open Graph and JSON-LD metadata. When a post sets no
`author`, Voxx falls back to `site.author` from `voxx.json`.

## Drafts

`draft: true` keeps a page out of everything — lists, feeds, sitemaps,
`llms.txt`, and its own URL. Nobody can read a draft by guessing the link.
To preview drafts, use [`voxx dev`](/docs/reference/cli#voxx-dev) (which
includes them by default), pass `--drafts` to
[`voxx build`](/docs/reference/cli#voxx-build), or set
`content.drafts: true` while developing.

To publish a draft's page for sharing while keeping it out of lists and
feeds, set the collection's [`drafts: "unlisted"`](/docs/reference/configuration#content)
instead — the page builds and is reachable by URL, but stays hidden.

## Derived values

When you don't provide them, Voxx computes:

- **Slug** — from the filename, after stripping date/order prefixes, then
  slugified (`Älä Hätäile.md` → `ala-hataile`)
- **Excerpt** — the first ~180 characters of body text, with code blocks,
  headings, images, and markup stripped
- **Reading time** — at 200 words per minute, minimum one minute
