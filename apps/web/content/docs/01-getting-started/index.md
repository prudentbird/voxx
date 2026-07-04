---
title: Getting started
description: Scaffold your first Voxx surface in a couple of minutes.
---

Every Voxx setup starts the same way — pick a surface, run one command:

```bash
npx @prudentbird/voxx init            # a blog
npx @prudentbird/voxx init docs       # a docs site
npx @prudentbird/voxx init changelog  # a release-notes page
```

`voxx init` looks at the directory you run it in and does the right thing:

- **Next.js app detected** — it scaffolds routes under `app/` (or `src/app/`),
  writes a `voxx.json` and sample content, and wraps your `next.config` with
  [`withVoxx`](#rendering-modes) when it can do so safely. The generated
  components live in a `_voxx/` folder inside the mounted route — they're plain
  files you own and restyle.
- **No Next.js** — it asks whether you want a static site (rendered with
  `voxx build`) or a fresh app via `create-next-app`, then scaffolds into
  your choice.

Then install the engine the scaffolded files import:

```bash
npm i @prudentbird/voxx-core
```

Set `site.url` in `voxx.json`, start your dev server, and open the mount path
(`/blog`, `/docs`, or `/changelog`). That's the whole loop: write markdown,
refresh, publish on deploy.

## Common flags

Every preset accepts the same flags:

| Flag            | Default       | What it does                             |
| --------------- | ------------- | ---------------------------------------- |
| `--base /notes` | `/<preset>`   | Mount path — scaffolded routes follow it |
| `--dir content` | `content`     | Where your markdown lives                |
| `--app src/app` | auto-detected | The Next.js app directory                |
| `--force`       | off           | Overwrite files that already exist       |

## Rendering modes

Voxx adapts to the host app instead of reconfiguring it. The default data layer
memoizes filesystem reads for the life of each deploy, so pages prerender and
content reads cost nothing at request time. No whole-app rendering switch comes
with it, and existing routes keep behaving exactly as they did.

`withVoxx` wires only the serverless plumbing every Voxx app needs. It keeps
`@prudentbird/voxx-core` external and traces `voxx.json` plus your content
directories into the serverless bundle so runtime reads resolve. It never sets
`cacheComponents`, so how the rest of your app renders stays your call:

```ts
import type { NextConfig } from "next";
import { withVoxx } from "@prudentbird/voxx-core/next";

const nextConfig: NextConfig = {};

export default withVoxx(nextConfig);
```

Apps that already enable Next's Cache Components get a matching data layer built
on the `"use cache"` directive, pinned to the `max` lifetime so it refreshes
only on rebuild. `voxx init` detects `cacheComponents: true` in your
`next.config` and scaffolds that variant automatically. Pass
`--cache-components` or `--no-cache-components` to choose the variant yourself.

On Next 16+, `voxx init` wraps your config when it has a recognizable shape.
Otherwise it prints the snippet to add yourself.

## Pick your surface

Each surface has its own one-page guide:

- [Start a blog](/docs/getting-started/blog)
- [Start a docs site](/docs/getting-started/docs)
- [Start a changelog](/docs/getting-started/changelog)
- [Static sites](/docs/getting-started/static-sites) — any stack, no framework
