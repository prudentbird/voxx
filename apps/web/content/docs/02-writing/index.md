---
title: Writing content
description: Markdown files, naming conventions, and the voxx new command.
---

Everything Voxx publishes is a markdown file: YAML frontmatter on top, prose
below. There's no editor to learn and no required workflow — create files by
hand, with `voxx new`, or let an agent write them.

```markdown
---
title: Hello, world
description: An optional summary used for SEO and excerpts.
---

## Why files win

Prose wants to be prose. Just write and commit.
```

## What the renderer gives you

Voxx renders GitHub-flavored markdown — tables, task lists, strikethrough,
autolinks — and adds:

- **Syntax highlighting** via Shiki, with paired light/dark themes
- **Heading anchors** — every heading gets an id and a self-link, so deep
  links work with JavaScript disabled
- **A table of contents** collected from your `h2`/`h3` headings, which
  powers the "On this page" widget
- **Excerpts and reading time**, derived from the body unless frontmatter
  says otherwise

Raw HTML passes through untouched, so `<details>`, `<video>`, and custom
embeds work inside markdown. Only `.md` files are picked up — there's no
MDX compiler, so `.mdx` is deliberately ignored rather than silently
stripped of its JSX.

## Filename conventions

Filenames carry meaning, and each surface reads them differently:

| Surface   | Filename              | Meaning                               |
| --------- | --------------------- | ------------------------------------- |
| Blog      | `2026-06-11-hello.md` | Date-stamps the post; slug is `hello` |
| Docs      | `01-install.md`       | Pins sidebar order; slug is `install` |
| Changelog | `1.4.0.md`            | Names the release version             |

Frontmatter always wins over the filename — an explicit `date:`, `order:`,
`slug:`, or `version:` overrides whatever the name implies.

## `voxx new`

The CLI knows which surface it's in (from `voxx.json`) and creates the right
kind of file:

```bash
voxx new "Why files win"                       # blog: 2026-06-11-why-files-win.md
voxx new "Deploying" --section guides --order 3  # docs: guides/03-deploying.md
voxx new "1.4.0"                               # changelog: 1.4.0.md
```

If a slug is already taken, `voxx new` suggests a free one instead of
overwriting. It never touches existing files.

## In this section

- [Frontmatter](/docs/writing/frontmatter) — every field, and what's derived
  when you leave it out
- [Organizing docs](/docs/writing/organizing-docs) — folders, ordering, and
  `index.md`
- [Writing releases](/docs/writing/releases) — version files and the timeline
