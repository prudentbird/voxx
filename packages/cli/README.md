# voxx

A zero-friction CMS for you and your agents. Write markdown the way you ship code, and Voxx handles the rest.

```bash
npx @prudentbird/voxx init            # interactive wizard (type, name, features)
npx @prudentbird/voxx init blog docs  # scaffold several collections at once
npx @prudentbird/voxx init changelog --yes  # headless, accept defaults
```

## Commands

### `voxx init [blog|docs|changelog ...]`

An interactive, shadcn-style wizard. It detects your setup and asks only for what it needs:

- **Target** — when there's no Next.js app, choose a static site (`voxx build`) or a fresh app via `create-next-app`, then scaffold into it.
- **Collections** — pick one or more types and name each (a blog can live at `/posts`).
- **Site details** — title, description, URL (each defaulted; press Enter to accept).
- **Features** — multiselect which features to enable, pre-checked to the recommended defaults for the chosen types.

It then writes routes under `app/<basePath>/` (private `_voxx/` folder for the data layer and components — all yours to restyle), the `rss.xml`/`llms.txt`/`llms-full.txt`/`sitemap`/`robots` routes for the **enabled** features, and wraps your next.config with `withVoxx` when it's safe to (Next 16+, recognizable config shape). Existing files are never overwritten without confirmation.

Flags: `--name posts`, `--base /notes`, `--dir content`, `--app src/app`, `--target my-app`, `--static`/`--next`, `--no-<feature>` (e.g. `--no-sitemap`, `--no-llms`), `--yes`, `--force`. `--name`/`--dir`/`--base` apply when scaffolding a single type.

### `voxx add collection <blog|docs|changelog>`

Appends a collection to an existing project — migrates `voxx.json` to the `collections` array and scaffolds its routes. Flags: `--name`, `--dir`, `--base`, `--force`.

### `voxx add <feature>` / `voxx remove <feature>`

Toggle a feature after the fact. `add sitemap` flips `features.sitemap` on and scaffolds its route; `remove llms` flips it off and deletes the generated routes (with a confirmation). Features: `rss`, `sitemap`, `robots`, `llms`, `toc`, `tags`, `reading-time`.

### `voxx new "Title"`

Type-aware: creates a date-prefixed post (blog), an order-prefixed page (`--section getting-started --order 2`, docs), or a versioned release file (`voxx new "1.4.0"`, changelog).

### `voxx build`

Renders the whole site to static HTML in `./dist` — post list, docs tree with sidebar + prev/next, or release timeline — plus `rss.xml`, `sitemap.xml`, `robots.txt`, `llms.txt`, and `llms-full.txt` per your feature flags. Images and other content assets are copied through, and every collection in a multi-collection config is built in one pass (each blog/changelog surface gets its own feed under its base path).

### `voxx dev`

A preview server for static sites: builds to a temp directory, watches `voxx.json` and your content folders, rebuilds on change, and serves the result on `--port` (default 4321). Drafts are included by default so you can review them at their real URLs.

## Content conventions

- Folders become docs sections; `index.md` is a section's landing page.
- `01-install.md` pins ordering without leaking into the URL (`/docs/install`).
- `2026-06-11-hello.md` date-stamps a post; frontmatter always wins.
- Release files are named by version (`1.4.0.md`) or carry `version:` frontmatter.

Configuration lives in `voxx.json` (JSON-schema autocompleted). The engine is [`@prudentbird/voxx-core`](../core) — use it directly if you'd rather bring your own framework.
