# @prudentbird/voxx-core

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
