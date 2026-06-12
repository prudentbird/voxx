---
title: Start a docs site
description: Folders become the sidebar; ordering is a filename prefix.
---

From the root of your Next.js app:

```bash
npx voxx init docs
npm i @voxx/core
```

This writes:

```
voxx.json                        # config, with type: "docs"
content/index.md                 # the docs landing page
content/01-getting-started/      # a sample section
  index.md                       #   the section's landing page
  01-installation.md             #   an ordered page inside it
app/docs/[[...slug]]/page.tsx    # one route renders the whole tree
app/docs/layout.tsx              # imports the Voxx stylesheet
app/docs/_voxx/*                 # sidebar, pager, TOC — yours to edit
app/sitemap.ts                   # sitemap.xml
app/llms.txt/route.ts            # /llms.txt
```

Open `/docs` and you'll see the sidebar built from your folders, a prev/next
pager that walks the tree in order, and an "On this page" widget built from
your headings.

## The conventions

Three rules drive the whole thing:

1. **Folders become sections.** `content/guides/deploy.md` ships at
   `/docs/guides/deploy` and nests under a "Guides" node in the sidebar.
2. **`index.md` lands a section.** It gives the section node its title and
   URL; without one the section is a label in the sidebar. A root `index.md`
   is the docs landing page itself.
3. **Numeric prefixes pin order without touching URLs.** `01-install.md`
   ships at `/docs/install`; the `01-` only decides where it sorts. The same
   works on folders: `02-writing/` → `/docs/writing`.

The full details — ordering precedence, slugs, nesting — live in
[Organizing docs](/docs/writing/organizing-docs).

## Add a page

```bash
npx voxx new "Deploying" --section guides --order 3
```

creates `content/guides/03-deploying.md`. Or just create the file — the CLI
is a convenience, never a requirement.

## What docs get by default

Docs sites default to: table of contents, sitemap, and `llms.txt` **on**;
RSS, tags, and reading time **off** — those are blog concerns.
Any flag can be overridden in [`voxx.json`](/docs/reference/configuration).

This very site is the output of these conventions — the sidebar to your left
is a folder listing.
