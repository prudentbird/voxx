---
title: Introduction
description: What Voxx is, why files, and how the pieces fit together.
---

Voxx is a zero-friction, file-based CMS. You point it at a folder of markdown
and it ships a **blog**, a **docs site**, or a **changelog** — no database, no
admin UI, no lock-in. Every page is a plain `.md` file with a little YAML
frontmatter, so humans and agents can read and write your content with the
same tools they use for code.

This page — and every page in this section — is rendered by Voxx from a
markdown file in the [repository](https://github.com/prudentbird/voxx). The
sidebar, the "On this page" widget, the prev/next pager, the sitemap, and the
`llms.txt` behind this site all come from the engine described here.

## Why files

Prose wants to be prose — headings, paragraphs, the occasional list — not rows
in a database. Keeping each page as one file means you can:

- grep, diff, branch, and review content exactly like code
- edit anywhere, in any editor, offline
- let an agent discover, read, and write pages directly — no API tokens, no
  custom integration

A folder of files will outlive every CMS.

## One engine, three surfaces

Voxx renders three kinds of content, all through the same pipeline:

| Surface   | Shape              | Convention                                        |
| --------- | ------------------ | ------------------------------------------------- |
| Blog      | Flat, newest-first | `2026-06-11-hello.md` date-stamps a post          |
| Docs      | Ordered tree       | Folders become sections; `01-` prefixes pin order |
| Changelog | Versioned timeline | `1.4.0.md` becomes a release with a stable anchor |

Need more than one on the same site? Mount them side by side with
[collections](/docs/reference/collections).

## What you get out of the box

- GitHub-flavored markdown with [Shiki](https://shiki.style) syntax
  highlighting (light **and** dark)
- An "On this page" table of contents built from your headings
- Open Graph, Twitter cards, type-aware JSON-LD, and canonical URLs
- `sitemap.xml`, RSS, and `llms.txt`, each toggled per surface
- Styles that [inherit your design tokens](/docs/reference/theming) — shadcn
  variables just work

## How the pieces fit

- **[`@voxx/core`](/docs/reference/core-api)** is the portable engine: plain
  async functions in, structured data out. It has no opinion about your
  framework.
- **The [`voxx` CLI](/docs/reference/cli)** scaffolds a surface into your
  Next.js app — real, editable files you own — or renders a self-contained
  static site for any other stack.

Ready? Head to [Getting started](/docs/getting-started).
