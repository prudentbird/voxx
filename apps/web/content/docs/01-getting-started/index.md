---
title: Getting started
description: Scaffold your first Voxx surface in a couple of minutes.
---

Every Voxx setup starts the same way — pick a surface, run one command:

```bash
npx voxx init            # a blog
npx voxx init docs       # a docs site
npx voxx init changelog  # a release-notes page
```

`voxx init` looks at the directory you run it in and does the right thing:

- **Next.js app detected** — it scaffolds routes under `app/` (or `src/app/`),
  writes a `voxx.json` and sample content, and turns on
  [Cache Components](#cache-components) in your `next.config` when it can do
  so safely. The generated components live in a `_voxx/` folder inside the
  mounted route — they're plain files you own and restyle.
- **No Next.js** — it asks whether you want a static site (rendered with
  `voxx build`) or a fresh app via `create-next-app`, then scaffolds into
  your choice.

Then install the engine the scaffolded files import:

```bash
npm i @voxx/core
```

Set `site.url` in `voxx.json`, start your dev server, and open the mount path
(`/blog`, `/docs`, or `/changelog`). That's the whole loop: write markdown,
refresh, publish on deploy.

## Common flags

Every preset accepts the same flags:

| Flag | Default | What it does |
| --- | --- | --- |
| `--base /notes` | `/<preset>` | Mount path — scaffolded routes follow it |
| `--dir content` | `content` | Where your markdown lives |
| `--app src/app` | auto-detected | The Next.js app directory |
| `--force` | off | Overwrite files that already exist |

## Cache Components

The scaffolded data layer uses Next's `"use cache"` directive, so your pages
prerender statically and content reads cost nothing at request time. On
Next 16+, `voxx init` adds `cacheComponents: true` to your `next.config`
automatically when the config has a recognizable shape; otherwise it prints
the one-liner to add yourself:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

Content only changes on deploy, so a build-time cache is exactly right —
rebuild to publish.

## Pick your surface

Each surface has its own one-page guide:

- [Start a blog](/docs/getting-started/blog)
- [Start a docs site](/docs/getting-started/docs)
- [Start a changelog](/docs/getting-started/changelog)
- [Static sites](/docs/getting-started/static-sites) — any stack, no framework
