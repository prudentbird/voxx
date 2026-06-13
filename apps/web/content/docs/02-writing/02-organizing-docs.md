---
title: Organizing docs
description: Folders, ordering prefixes, and index.md — the whole system.
---

A docs collection mirrors its folder. There's no separate navigation config
to maintain: the tree on disk _is_ the sidebar, the URL structure, and the
prev/next order.

```
content/docs/
  index.md                     → /docs               (the landing page)
  01-getting-started/
    index.md                   → /docs/getting-started
    01-blog.md                 → /docs/getting-started/blog
    02-docs.md                 → /docs/getting-started/docs
  02-writing/
    index.md                   → /docs/writing
    01-frontmatter.md          → /docs/writing/frontmatter
  03-reference/                  (no index.md — a label-only section)
    01-configuration.md        → /docs/reference/configuration
```

That's this site's actual layout — compare it with the sidebar.

## Ordering

Within each level, pages sort by explicit order first, then alphabetically.
"Explicit order" comes from, in order of precedence:

1. `order:` in frontmatter
2. A numeric filename prefix: `01-install.md`, `2_setup.md`, `10.faq.md`
   (up to four digits, separated by `-`, `_`, or `.`)
3. For an `index.md`, the prefix on its folder (`01-getting-started/`)

Prefixes never reach the URL — `01-install.md` ships at `…/install`. Pages
without any order sort alphabetically after the ordered ones, so you can be
strict where order matters and lazy where it doesn't.

## `index.md`

An `index.md` represents its folder:

- **In a section** — it becomes the section's landing page, and gives the
  sidebar node its title and URL.
- **At the root** — it becomes the collection's landing page, served at the
  base path itself (`/docs`).
- **Absent** — the section still appears in the sidebar, but as a plain
  label (the folder name, humanized: `03-reference/` → "Reference"). On
  static builds, a missing root index gets a generated landing page so the
  base path isn't a 404.

## Titles and the sidebar

Sidebar entries use each page's `title:`. Only the label-only sections fall
back to humanized folder names. The prev/next pager at the bottom of every
page walks the same depth-first order the sidebar shows.

## Nesting

Trees can nest as deep as you need — every folder level becomes a URL
segment and a sidebar level. In practice two levels (section / page) read
best; if you're reaching for a third, consider whether it should be a new
section instead.
