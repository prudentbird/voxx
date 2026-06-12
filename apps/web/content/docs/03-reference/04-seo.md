---
title: SEO and feeds
description: Open Graph, JSON-LD, canonical URLs, RSS, sitemaps, and llms.txt.
---

Publishing well is most of why a CMS exists, so Voxx treats SEO as output,
not homework. Every page gets a complete, framework-neutral SEO payload;
feeds and indexes come from the same data.

## Per-page metadata

`buildSeo(post, config)` assembles everything a `<head>` needs:

- **Canonical URL** — `site.url` + the post's URL
- **Open Graph** — title, description, images, locale, published/modified
  times, authors, and tags
- **Twitter card** — `summary_large_image`, with `seo.twitter` as the
  site/creator handle
- **JSON-LD** — typed per surface: `BlogPosting` for blogs, `TechArticle`
  for docs, `Article` for changelog entries

Descriptions fall back from `description:` to the derived excerpt; images
fall back from `image:` to `seo.defaultImage`; authors fall back from
`author:` to `site.author`. In the Next.js scaffold, a small `toMetadata`
helper maps this payload onto `generateMetadata` — on other stacks, render
the same fields into your own templates.

Toggle the pieces in `voxx.json`:

```jsonc
{
  "seo": {
    "openGraph": true,
    "twitter": "@acme",
    "jsonLd": true,
    "defaultImage": "/og.png"
  }
}
```

## RSS

`renderRss(posts, config)` produces an RSS 2.0 feed with stable GUIDs,
tags as categories, full HTML bodies in `content:encoded`, and a
self-referencing atom link. The feed lives under its collection's base
path — `/blog/rss.xml`, `/changelog/rss.xml` — in both the scaffold and
static builds, one per surface. On by default for blogs and changelogs (a
release feed is a nice thing to subscribe to).

## Sitemap and robots.txt

`renderSitemap(posts, config)` covers the collection index and every page,
with `lastmod` from `updated:` falling back to `date:`. The Next.js
scaffold uses `app/sitemap.ts` instead, feeding the same data through
Next's metadata route. Alongside it, `renderRobotsTxt(config)` (or the
scaffolded `app/robots.ts`) emits a `robots.txt` that points crawlers at
the sitemap.

## llms.txt

Voxx generates an [`llms.txt`](https://llmstxt.org) — a markdown index of
your site (title, summary, and a linked, described list of every page) that
agents can fetch to orient themselves before crawling. `llms-full.txt`
goes further and concatenates the full markdown body of every page into one
document, ideal for stuffing a context window. Both are served by the
scaffold and written by static builds.

This site's own [/llms.txt](/llms.txt) and [/llms-full.txt](/llms-full.txt)
are the live output.

## Drafts stay out

Draft pages are excluded from feeds, sitemaps, and `llms.txt` along with
everything else — flipping `draft: false` publishes a page everywhere at
once.
