# voxx

A zero-friction CMS for you and your agents. Write markdown the way you ship code, and Voxx handles the rest.

```bash
npx @prudentbird/voxx init            # scaffold a blog into your Next.js app
npx @prudentbird/voxx init docs       # or a docs site
npx @prudentbird/voxx init changelog  # or a release-notes page
```

## Commands

### `voxx init [blog|docs|changelog]`

Scaffolds a surface into your app:

- **Next.js detected** — writes routes under `app/<basePath>/` (private `_voxx/` folder for the data layer and components — all yours to restyle), `rss.xml`/`llms.txt`/`llms-full.txt` routes plus a sitemap and `robots.ts` where the type calls for them, and enables `cacheComponents` in your next.config when it's safe to (Next 16+, recognizable config shape).
- **No Next.js** — asks whether you want a static site (`voxx build`) or a fresh app via `create-next-app`, then scaffolds into it.

Flags: `--base /notes` (mount path — routes follow it), `--dir content`, `--app src/app`, `--force`.

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
