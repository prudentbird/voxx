---
title: Images and assets
description: Keep images next to your markdown — no public folder juggling.
---

Non-markdown files that live in a content folder are first-class citizens:
images, PDFs, fonts, downloads — anything that isn't `.md` ships with your
site. There's no separate `public/` directory to keep in sync; drop the file
into an `assets/` folder next to the post that uses it and reference it
relatively.

```markdown
---
title: Shipping Voxx 2.0
date: 2026-08-25
---

![Architecture diagram](./assets/architecture.png)

See the [full benchmark data](./assets/benchmarks.pdf) for details.
```

Voxx resolves every relative `src` and `poster` reference against the
post's own directory (including `../` escapes into parent folders), so
links never break when content moves — as long as the file moves with it.
Absolute URLs (`https://…`), root-relative (`/logo.png`), anchors, and
query strings pass through untouched.

## Where files land

- **Static builds** — every non-markdown file is copied into the output,
  preserving its path relative to the content folder. A file at
  `content/blog/assets/architecture.png` serves at
  `/blog/assets/architecture.png`.
- **Next.js** — files inside an `assets/` directory are served through a
  catch-all route under `/voxx-assets/…`, so the reference above renders as
  `/voxx-assets/blog/assets/architecture.png`. Files outside `assets/` are
  page material, not downloads, and won't resolve. The scaffolder creates
  this route (`app/(voxx)/voxx-assets/[...path]/route.ts`) for you;
  projects scaffolded before it existed can copy that one file from a fresh
  scaffold.

Either way, authoring looks identical: `./assets/architecture.png`, right
next to the markdown.

## Organizing assets

Nested folders give each page its own namespace:

```text
content/docs/
  01-getting-started/
    install.md
    assets/
      diagram.png        → referenced from install.md as ./assets/diagram.png
  02-writing/
    assets/
      logo.svg           → referenced from a sibling page as ../writing/assets/logo.svg
```

## Blog's flat namespace

Blog collections are flat: every post's `assets/` folder shares one URL
space under the base path. Two posts each shipping their own
`assets/cover.png` would collide — use unique filenames, or per-post
subdirectories if a post needs several images. Docs and changelog
collections nest naturally and don't have this issue.

## What counts as an asset

Anything inside an `assets/` directory except `.md` sources, `.mdx`
(ignored entirely), and dotfiles. Markdown sources are never served as
static files — they become pages, not downloads — and files outside
`assets/` are treated as page material, not downloads.
