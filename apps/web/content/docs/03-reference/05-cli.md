---
title: CLI
description: voxx init, voxx new, voxx build, and voxx dev — flags and behavior.
---

```
voxx init [blog|docs|changelog] [--dir <content>] [--base <path>] [--app <dir>] [--force]
voxx init --add [blog|docs|changelog] [--name <name>] [--dir <dir>] [--base <path>] [--app <dir>]
voxx new "Title" [--collection <name>] [--dir <content>] [--date <YYYY-MM-DD>] [--slug <slug>] [--flat] [--section <path>] [--order <n>]
voxx build [--out <dir>] [--drafts]
voxx dev [--port <n>]
```

The CLI is a convenience layer — everything it does, you could do by hand
with files and [`@voxx/core`](/docs/reference/core-api).

## `voxx init [preset]`

Scaffolds a surface. The preset (default `blog`) picks the sample content
and routes; the flags place them:

| Flag | Default | What it does |
| --- | --- | --- |
| `--base /notes` | `/<preset>` | Mount path — scaffolded routes follow it |
| `--dir content` | `content` | Content folder written into `voxx.json` |
| `--app src/app` | auto-detected | The Next.js app directory |
| `--force` | off | Overwrite existing files (default: skip them) |

With a Next.js app detected, `init` writes the routes for the preset, the
`_voxx/` data layer and components, `llms.txt` and `llms-full.txt` routes,
plus a sitemap and `robots.ts` (blog, docs) and an RSS route at
`<base>/rss.xml` (blog, changelog) where the type calls for them. On Next 16+ it also enables
`cacheComponents` in your `next.config` when the config's shape is
unambiguous — otherwise it tells you what to add.

If your app already defines design tokens (`--background` and friends in a
`globals.css`), Voxx inherits them; if not, `init` adds a starter
`voxx-globals.css`.

Without Next.js, `init` asks: static site (just `voxx.json` + content,
rendered by `voxx build`) or a new app via `create-next-app`. In a
non-interactive shell it defaults to static.

`init` is idempotent — existing files are skipped and reported, never
overwritten, unless you pass `--force`.

## `voxx init --add <preset>`

Adds a second (or third…) collection to a site that already has a
`voxx.json` — `voxx init --add docs` on a blog gives you a
[multi-collection](/docs/reference/collections) site:

| Flag | Default | What it does |
| --- | --- | --- |
| `--name notes` | the preset name | The collection's name — what `voxx new --collection` and `getPosts({ collection })` use |
| `--dir content/notes` | `content/<name>` | The new collection's content folder |
| `--base /notes` | `/<name>` | Mount path for the new collection's routes |
| `--app src/app` | auto-detected | The Next.js app directory |

It rewrites `voxx.json` (migrating a single-collection `content` config to a
`collections` array — resolved behavior is preserved exactly), then scaffolds
only the new collection's content samples and routes. Site-wide files
(`sitemap.ts`, `robots.ts`, the `llms.txt` routes) are left alone if present
and created only when missing.

`--add` never overwrites: it requires an existing `voxx.json`, refuses
`--force`, and fails — writing nothing — if the new collection's name, `dir`,
or `basePath` collides with an existing one. Pass `--name`, `--dir`, or
`--base` to resolve a collision.

Note that feature defaults (`rss`, `toc`, …) follow the *first* collection's
type — review `features` in `voxx.json` after adding a collection of a
different type.

## `voxx new "Title"`

Creates a content file, shaped by the collection type in `voxx.json`:

| Type | `voxx new "X"` creates | Useful flags |
| --- | --- | --- |
| blog | `2026-06-11-x.md` | `--date`, `--slug`, `--flat` (no date prefix) |
| docs | `x.md` | `--section guides`, `--order 3` → `guides/03-x.md` |
| changelog | `X.md` with `version:` set | — (the title *is* the version) |

On a multi-collection site, `--collection <name>` picks which collection the
file lands in — `voxx new "Install" --collection docs` writes a docs page even
when the blog is listed first. Without the flag, the first collection in
`voxx.json` wins. An unknown name fails and lists the defined collections.

If the slug is taken, `voxx new` proposes a free one (`x-2`) — interactively
when it can, automatically when it can't. It never overwrites.

## `voxx build`

Renders every collection to static HTML in `./dist` — pages, styles,
images and other content assets, and the outputs your
[feature flags](/docs/reference/configuration#features) ask for
(`rss.xml`, `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`).

| Flag | Default | What it does |
| --- | --- | --- |
| `--out public` | `dist` | Output directory |
| `--drafts` | off | Include `draft: true` pages (a collection's `drafts: true` in `voxx.json` also works) |

See [Static sites](/docs/getting-started/static-sites) for what each
content type produces.

## `voxx dev`

A local preview server for static sites: builds to a temp directory,
watches `voxx.json` and your content folders, rebuilds on change, and
serves the result. Drafts are included by default — `voxx dev` is the
draft-preview story.

| Flag | Default | What it does |
| --- | --- | --- |
| `--port 8080` | `4321` | Port to listen on |
