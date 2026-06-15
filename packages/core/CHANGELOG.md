# @prudentbird/voxx-core

## 1.2.1

### Patch Changes

- bef7f6b: Allow the `$schema` key in `voxx.json`. The generated config schema had `additionalProperties: false` at the root without whitelisting `$schema`, so configs referencing the schema for IDE support failed validation. `$schema` is now an accepted optional property in both the generated JSON schema and runtime decoding.

## 1.2.0

### Minor Changes

- 03c7172: Add a `withVoxx` Next.js config helper (`@prudentbird/voxx-core/next`) that enables Cache Components, marks `@prudentbird/voxx-core` as an external server package, and traces `voxx.json` plus every content directory into the serverless function bundle. This fixes runtime `ConfigError` failures during cache revalidation on platforms that bundle each route into an isolated function.

  `voxx init` now wraps the `next.config` default export with `withVoxx` instead of injecting `cacheComponents: true`, and the scaffolded data layer pins cached reads to the `max` lifetime so content refreshes only on redeploy.

## 1.1.0

### Minor Changes

- 00edba7: Rework the theme layout for a wider reading column and full-bleed docs. The docs layout drops its fixed `max-width` and renders edge-to-edge: the sidebar nav sits at the far left, the table of contents at the far right, and the article is centered in the space between. Blog articles, changelog releases, and docs content now share a 45rem (720px) reading column and all center by default — the previous desktop margin reset that left-aligned blog articles has been removed so `.voxx-article` stays centered at every breakpoint.
- 82af8f4: Add an optional `site.titleHref` config field that controls where the header / sidebar title link points. The title now links to `site.titleHref` when set and defaults to the site root (`"/"`) otherwise — across the static build (blog, changelog, and docs) and the scaffolded Next.js layouts, so both stay in sync. This is distinct from `site.url` (the canonical origin used for SEO); `titleHref` is purely the navigation target, so a blog, docs, or changelog embedded under a larger site points its title at the parent home without post-build `sed` rewrites.

  Blog post pages now also render a "All posts" back link above the article title that returns to the collection index, so in-collection navigation no longer depends on the title link's destination.

  When `titleHref` is left unset (defaulting to `/`) and no collection is served at the root, `voxx build` now warns that the `/` route won't exist and points you to set `site.titleHref` — relevant for a standalone blog served under a subpath like `/blog`.

## 1.0.0

### Major Changes

- 8bf923f: Initial stable release of `voxx` CLI and `@prudentbird/voxx-core`.

  This is the first major (1.0.0) release. The public API is now considered stable.

  **`voxx` CLI** — scaffolds new Voxx sites via `voxx init`.

  **`@prudentbird/voxx-core`** — core rendering primitives for Voxx-powered sites, including MDX processing, navigation, and search.
