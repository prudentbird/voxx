# voxx

A zero-friction CMS for you and your agents. Write markdown the way you ship code, and Voxx handles the rest.

```bash
npx @prudentbird/voxx init            # interactive wizard (type, name, features)
npx @prudentbird/voxx init blog docs  # scaffold several collections at once
npx @prudentbird/voxx init changelog --yes  # headless, accept defaults
```

## Commands

### `voxx init [blog|docs|changelog ...]`

An interactive wizard. It detects your setup and asks only for what it needs:

- **Target** — when there's no Next.js app, choose a static site (`voxx build`) or a fresh app via `create-next-app`, then scaffold into it.
- **Collections** — pick one or more types and name each (a blog can live at `/posts`).
- **Site details** — title, description, URL (each defaulted; press Enter to accept).
- **Features** — multiselect which features to enable, pre-checked to the recommended defaults for the chosen types.

Everything Voxx generates lives in an `app/(voxx)/` route group, with each collection self-contained:

```
app/
  (site)/        ← your own pages and root layout
  (voxx)/
    layout.tsx               voxx's <html>/<body> root shell
    _voxx/                   shared theme CSS
    sitemap.ts robots.ts llms.txt/ llms-full.txt/   (enabled features)
    blog/
      layout.tsx page.tsx [slug]/page.tsx rss.xml/route.ts
      _data.ts _post-list.tsx _theme-toggle.tsx …    private (underscore-prefixed)
      _content/…md                                   the collection's markdown
```

**Root layout.** Voxx routes need their own `<html>`/`<body>`. For a new app, Voxx splits the root into `(site)/layout.tsx` (yours) and `(voxx)/layout.tsx` (Voxx's). For an **existing** app it warns that your layout will wrap Voxx routes and offers to **fix** it (move your layout into `(site)/`) or **ignore** it (nest under your layout, chrome and all). Non-interactively the default is ignore + warn — Voxx never moves your files silently. Force the choice with `--isolate` / `--no-isolate`.

Voxx writes the `rss.xml`/`llms.txt`/`llms-full.txt`/`sitemap`/`robots` routes for the **enabled** features only, and wraps your next.config with `withVoxx` when it's safe to (Next 16+, recognizable config shape). Existing files are never overwritten without confirmation.

Flags: `--name posts`, `--base /notes`, `--dir <path>`, `--app src/app`, `--target my-app`, `--static`/`--next`, `--isolate`/`--no-isolate`, `--no-<feature>` (e.g. `--no-sitemap`, `--no-llms`), `--yes`, `--force`. `--name`/`--dir`/`--base` apply when scaffolding a single type.

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

### `voxx telemetry [status|enable|disable]`

Manages anonymous usage telemetry. `status` prints the current resolved state (and any active env override), `disable` opts out, `enable` opts back in.

Voxx reports a single anonymous event per command — the command name, whether it succeeded, its duration, and the package/Node/OS versions. It **never** collects arguments, file paths, names, or content. The CLI prints a one-time notice on first run.

Opt out persistently with `voxx telemetry disable`, or per-invocation with `VOXX_TELEMETRY_DISABLED=1`, `DO_NOT_TRACK=1`, or `CI=1` (telemetry is also off automatically in CI). The opt-out state lives in `${XDG_STATE_HOME:-~/.local/state}/voxx/telemetry.json`.

## Content conventions

- Folders become docs sections; `index.md` is a section's landing page.
- `01-install.md` pins ordering without leaking into the URL (`/docs/install`).
- `2026-06-11-hello.md` date-stamps a post; frontmatter always wins.
- Release files are named by version (`1.4.0.md`) or carry `version:` frontmatter.

Configuration lives in `voxx.json` (JSON-schema autocompleted). The engine is [`@prudentbird/voxx-core`](../core) — use it directly if you'd rather bring your own framework.
