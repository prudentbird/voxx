# voxx

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
