# voxx

## 1.3.0

### Minor Changes

- c18fa15: Multiple authors, unlisted drafts, dated scaffolding, and friendlier empty states.

  - **Authors**: frontmatter `author` now accepts a name, an object with an optional `url`, or a list of either. Posts expose `authors: VoxxAuthor[]`, render a visible byline, and emit every author in Open Graph and JSON-LD.
  - **Unlisted drafts**: `drafts` is now tri-state (`false | true | "unlisted"`). `"unlisted"` builds a draft's page so it is reachable by URL for previews while staying out of listings, RSS, sitemap, and llms. `voxx build` warns when `drafts: true` would publish drafts as normal posts.
  - **Dated scaffolding**: `voxx init` (blog) scaffolds `YYYY-MM-DD-<slug>.md`, matching `voxx new`.
  - **Empty states**: a missing content directory no longer throws — it degrades to an empty state, and empty listings show a helpful hint instead of bare text.

### Patch Changes

- Updated dependencies [c18fa15]
  - @prudentbird/voxx-core@1.3.0

## 1.2.1

### Patch Changes

- Updated dependencies [bef7f6b]
  - @prudentbird/voxx-core@1.2.1

## 1.2.0

### Minor Changes

- 03c7172: Add a `withVoxx` Next.js config helper (`@prudentbird/voxx-core/next`) that enables Cache Components, marks `@prudentbird/voxx-core` as an external server package, and traces `voxx.json` plus every content directory into the serverless function bundle. This fixes runtime `ConfigError` failures during cache revalidation on platforms that bundle each route into an isolated function.

  `voxx init` now wraps the `next.config` default export with `withVoxx` instead of injecting `cacheComponents: true`, and the scaffolded data layer pins cached reads to the `max` lifetime so content refreshes only on redeploy.

### Patch Changes

- Updated dependencies [03c7172]
  - @prudentbird/voxx-core@1.2.0

## 1.1.0

### Minor Changes

- 82af8f4: Add an optional `site.titleHref` config field that controls where the header / sidebar title link points. The title now links to `site.titleHref` when set and defaults to the site root (`"/"`) otherwise — across the static build (blog, changelog, and docs) and the scaffolded Next.js layouts, so both stay in sync. This is distinct from `site.url` (the canonical origin used for SEO); `titleHref` is purely the navigation target, so a blog, docs, or changelog embedded under a larger site points its title at the parent home without post-build `sed` rewrites.

  Blog post pages now also render a "All posts" back link above the article title that returns to the collection index, so in-collection navigation no longer depends on the title link's destination.

  When `titleHref` is left unset (defaulting to `/`) and no collection is served at the root, `voxx build` now warns that the `/` route won't exist and points you to set `site.titleHref` — relevant for a standalone blog served under a subpath like `/blog`.

### Patch Changes

- Updated dependencies [00edba7]
- Updated dependencies [82af8f4]
  - @prudentbird/voxx-core@1.1.0

## 1.0.1

### Patch Changes

- d804841: Sync scaffolded `robots.ts` and `sitemap.ts` templates with the dogfooded web app — newly initialized projects now get the `disallow` rules and sitemap `changeFrequency`/`priority` SEO improvements.

## 1.0.0

### Major Changes

- 8bf923f: Initial stable release of `voxx` CLI and `@prudentbird/voxx-core`.

  This is the first major (1.0.0) release. The public API is now considered stable.

  **`voxx` CLI** — scaffolds new Voxx sites via `voxx init`.

  **`@prudentbird/voxx-core`** — core rendering primitives for Voxx-powered sites, including MDX processing, navigation, and search.

### Patch Changes

- Updated dependencies [8bf923f]
  - @prudentbird/voxx-core@1.0.0
