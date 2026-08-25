---
title: Images and assets
description: Keep images next to your markdown — no public folder juggling.
---

Non-markdown files that live in a content folder are first-class citizens:
images, PDFs, fonts, downloads — anything that isn't `.md` ships with your
site. There's no separate `public/` directory to keep in sync; drop the file
next to the post that uses it and reference it relatively.

```markdown
---
title: Shipping Voxx 2.0
date: 2026-08-25
---

![Architecture diagram](./architecture.png)

See the [full benchmark data](./benchmarks.pdf) for details.
```

Voxx resolves every relative `src` and `poster` reference against the
post's own directory (including `../` escapes into parent folders), so
links never break when content moves — as long as the file moves with it.
Absolute URLs (`https://…`), root-relative (`/logo.png`), anchors, and
query strings pass through untouched.

## Where files land

- **Static builds** — every non-markdown file is copied into the output,
  preserving its path relative to the content folder. A file at
  `content/blog/architecture.png` serves at `/blog/architecture.png`.
- **Next.js** — the same files are served through a catch-all route under
  `/voxx-assets/…`, so the reference above renders as
  `/voxx-assets/blog/architecture.png`. The scaffolder creates this route
  (`app/(voxx)/voxx-assets/[...path]/route.ts`) for you; projects scaffolded
  before it existed can copy that one file from a fresh scaffold.

Either way, authoring looks identical: `./architecture.png`, right next to
the markdown.

## Organizing assets

Nested folders give each page its own namespace:

```text
content/docs/
  01-getting-started/
    install.md
    diagram.png          → referenced from install.md as ./diagram.png
  shared/
    logo.svg             → referenced as ../shared/logo.svg
```

A dedicated folder like `content/assets/` works too — reference it as
`../assets/image1.png` from a section page, or `/assets/…` paths stay
untouched if you prefer absolute references served some other way.

## Blog's flat namespace

Blog collections are flat: every asset in the folder shares one URL space
under the base path. Two posts each shipping their own `cover.png` would
collide — use unique filenames, or per-post subdirectories if a post needs
several images. Docs and changelog collections nest naturally and don't
have this issue.

## What counts as an asset

Everything except `.md` sources, `.mdx` (ignored entirely), and dotfiles.
Markdown sources are never served as static files — they become pages, not
downloads.
