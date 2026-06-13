# Voxx

A zero-friction, file-based CMS for you and your agents. Write markdown the way you ship code — in your repo, reviewed in PRs — and Voxx turns it into an SEO-ready blog, docs site, or changelog.

```bash
npx voxx init            # scaffold a blog into your Next.js app
npx voxx init docs       # or a docs site
npx voxx init changelog  # or a release-notes page
npx voxx dev             # no framework? preview a static site locally
```

## What you get

- **Markdown in, finished surface out** — frontmatter validation, GFM + raw HTML, Shiki highlighting, heading anchors, table of contents, excerpts, reading time.
- **Three content types** — `blog` (flat, newest-first), `docs` (folder tree → nested URLs with sidebar), `changelog` (versioned releases).
- **SEO that's just on** — canonical/Open Graph/Twitter/JSON-LD tags, `rss.xml`, `sitemap.xml`, `robots.txt`, `llms.txt`/`llms-full.txt`.
- **Two ways to ship** — scaffolded routes inside your Next.js app, or a fully static HTML build via `voxx build` (with `voxx dev` for local preview).
- **One config file** — `voxx.json`, JSON-schema validated, with multi-collection support for sites that need a blog _and_ docs _and_ a changelog.

## Packages

| Package                       | What it is                                                                 |
| ----------------------------- | -------------------------------------------------------------------------- |
| [`voxx`](packages/cli)        | The CLI: `init`, `new`, `build`, `dev`.                                    |
| [`@prudentbird/voxx-core`](packages/core) | The portable content engine — use it directly to bring your own framework. |

This repo also dogfoods itself: [`apps/web`](apps/web) is the Voxx docs site, built with Voxx.

## Development

```bash
pnpm install
pnpm build        # turbo: build all packages
pnpm test         # vitest across packages
pnpm typecheck
pnpm lint
```

Releases are managed with [changesets](https://github.com/changesets/changesets): `pnpm changeset` to record a change, `pnpm version-packages` + `pnpm release` to publish.

## License

[MIT](LICENSE)
