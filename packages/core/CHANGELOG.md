# @prudentbird/voxx-core

## 0.0.8

### Patch Changes

- Serve files in content-dir `assets/` folders through a `/voxx-assets` catch-all in Next.js mode (static builds already copied them), with `assetPrefix` support in the render pipeline and a new `serveContentAsset` core API. Path resolution rejects traversal, encoded backslash separators, dotfiles, Markdown sources regardless of case, and symlinks resolving outside `assets/` or onto Markdown; the longest-matching collection owns each URL. The scaffolded route caches its config load and recovers from transient config failures.

## 0.0.7

### Patch Changes

- Restore list-style for `ol` and `ul` in `.voxx-prose`, which was reset by Tailwind v4 preflight

## 0.0.6

### Patch Changes

- 6ae4e02: Stop forcing Cache Components on host apps.

  `withVoxx` no longer sets `cacheComponents`. It now wires only the serverless plumbing every Voxx app needs (`serverExternalPackages` and content `outputFileTracingIncludes`) and leaves the app's rendering mode entirely to the host. The `cacheComponents` flag passes through untouched like any other config field.

  `voxx init` scaffolds one of two data layers. The default static variant memoizes filesystem reads per deploy and needs no rendering-mode changes. The Cache Components variant (the previous `"use cache"` layer) is selected automatically when the host next.config enables `cacheComponents: true`, and can be forced either way with `--cache-components` / `--no-cache-components`.

  Breaking change: existing scaffolds that rely on the cached data layer must set `cacheComponents: true` in their own next.config, because `withVoxx` no longer enables it.

## 0.0.5

### Patch Changes

- c55e114: Bake the PostHog key into the published bundle. The `prepublishOnly`/`prepare`
  hooks re-ran `tsdown` (with `clean: true`) during install and publish without
  `VOXX_PUBLIC_POSTHOG_KEY` in the environment, overwriting the keyed build from
  the release Build step with a telemetry-stripped one. The key is now set at the
  release job level so every `tsdown` invocation embeds it.

## 0.0.4

### Patch Changes

- 68b3c4a: Add an anonymous, opt-out usage-telemetry engine, exported from the new
  `@prudentbird/voxx-core/telemetry` subpath. The engine emits three event types:

  - **`core_used`** — fired at most once per process the first time a public data
    function (`loadConfig`, `getPosts`, `renderMarkdown`, …) or `withVoxx` runs.
  - **`core_api_call`** — fired for every instrumented public API call, recording
    the API name, wall-clock duration, success flag, and (on failure) low-cardinality
    error metadata (`error_tag`, `error_name`, `error_code`, `cause_name`,
    `cause_code`). No arguments, paths, slugs, or content are ever included.
  - **`core_issue`** — fired when a recoverable internal issue is detected, recording
    a low-cardinality issue name and the same error-metadata shape as above.

  Telemetry is anonymous, non-blocking, and privacy-preserving: it sends only a
  random install id, the package version, the Node version, and the OS — never
  arguments, paths, names, or content. It is a no-op in builds without an embedded
  project key and never delays process exit. Opt out with `VOXX_TELEMETRY_DISABLED=1`,
  `DO_NOT_TRACK=1`, or `CI=1`.

## 0.0.3

### Patch Changes

- aa2065e: Rename the `theme.preset` config value from `"shadcn"` to `"default"`.

  This is a breaking change with no compatibility shim: existing `voxx.json`
  files that set `"preset": "shadcn"` must update the value to `"default"` or
  schema validation will fail. Newly scaffolded configs now emit `"default"`.

## 0.0.2

### Patch Changes

- 576b750: Add `listPosts` for metadata-only listing with filtering and pagination.

  Post processing now separates `PostMeta` (frontmatter-derived fields) from the rendered `Post`, so listing, sorting, filtering, and pagination never render Markdown. `listPosts` returns a paginated page of metadata plus the unpaginated total; `getPosts` gains the same `tag`/`category` filtering and `offset`/`limit` options and renders only what it returns; `getPost` renders just the matched post instead of the whole collection. `buildSeo`, `buildNavTree`, `renderSitemap`, and `renderLlmsTxt` now accept `PostMeta`.

- 7a4c526: Overhaul `voxx init` and add feature management commands.

  - `voxx init` is now an interactive wizard: choose static vs. a new Next.js app, scaffold one or more collections in a single run (`voxx init blog docs`), name each collection (e.g. a blog served at `/posts`), set site details, and pick which features to enable from recommended defaults. Pass `--yes` for a headless run and `--no-<feature>` (e.g. `--no-sitemap`, `--no-llms`) to disable features up front.
  - New `voxx add collection <type>` appends a collection to an existing project, `voxx add <feature>` enables a feature and scaffolds its route files, and `voxx remove <feature>` disables a feature and deletes its generated routes.
  - Every command now warns before overwriting existing files and only overwrites with confirmation or `--force`.
  - `robots.txt` is now a toggleable feature (`features.robots`), decoupled from `features.sitemap`. Core exposes a new `defaultFeatures(type)` helper.
