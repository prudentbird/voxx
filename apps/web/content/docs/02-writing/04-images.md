---
title: Images and assets
description: Keep images next to your markdown — no public folder juggling.
---

Files inside an `assets/` directory in a content folder ship with your
site: images, PDFs, fonts, and downloads. There's no separate `public/`
directory to keep in sync; drop the file into an `assets/` folder next to
the post that uses it and reference it relatively.

```markdown
---
title: Shipping Voxx 2.0
date: 2026-08-25
---

![Architecture diagram](./assets/architecture.png)

See the [full benchmark data](./assets/benchmarks.pdf) for details.
```

Voxx resolves every relative `src`, `poster`, and asset link (`<a href>`)
reference against the post's own directory (including `../` escapes into
parent folders), so links never break when content moves — as long as the
file moves with it.
Absolute URLs (`https://…`), root-relative (`/logo.png`), anchors, and
query strings pass through untouched.
Relative links to `.md` and `.mdx` files are left unchanged. Asset URLs
preserve any query string or fragment, such as `./assets/benchmarks.pdf#page=2`.

## Where files land

- **Static builds** — files below an `assets/` directory are copied into the output,
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

One limitation to know: the `/voxx-assets` prefix assumes the site is
served from the domain root. If your Next.js app sets a `basePath` in
`next.config.ts`, rendered asset URLs won't include it and will 404 —
deploy Voxx apps at the root, or rewrite `<basePath>/voxx-assets/*` to
`/voxx-assets/*` at your edge/proxy until this is supported natively.

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
      logo.svg           → referenced from install.md as ../02-writing/assets/logo.svg
```

## Blog's flat namespace

Blog collections are flat: every post's `assets/` folder shares one URL
space under the base path. Two posts each shipping their own
`assets/cover.png` would collide — use unique filenames, or per-post
subdirectories if a post needs several images. Docs and changelog
collections nest naturally and don't have this issue.

## What counts as an asset

Files below an `assets/` directory, excluding Markdown sources (`.md` and
`.mdx`, case-insensitive) and any path with a dot-file or dot-directory at
any depth. File and directory symlinks are allowed only when their resolved
targets stay inside the collection directory. Every file reached through a
symlink must also resolve to a visible, non-Markdown file below an `assets/`
directory. Static builds skip directory links that create cycles. Markdown sources are never served as
static files. Files outside `assets/` are not published as downloads by
either target. If you previously relied on static builds copying files
elsewhere in the content tree, move them into `assets/` and update their
references.
