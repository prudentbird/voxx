# @prudentbird/voxx-core

## 0.0.2

### Patch Changes

- 576b750: Add `listPosts` for metadata-only listing with filtering and pagination.

  Post processing now separates `PostMeta` (frontmatter-derived fields) from the rendered `Post`, so listing, sorting, filtering, and pagination never render Markdown. `listPosts` returns a paginated page of metadata plus the unpaginated total; `getPosts` gains the same `tag`/`category` filtering and `offset`/`limit` options and renders only what it returns; `getPost` renders just the matched post instead of the whole collection. `buildSeo`, `buildNavTree`, `renderSitemap`, and `renderLlmsTxt` now accept `PostMeta`.

- 7a4c526: Overhaul `voxx init` and add feature management commands.

  - `voxx init` is now an interactive wizard: choose static vs. a new Next.js app, scaffold one or more collections in a single run (`voxx init blog docs`), name each collection (e.g. a blog served at `/posts`), set site details, and pick which features to enable from recommended defaults. Pass `--yes` for a headless run and `--no-<feature>` (e.g. `--no-sitemap`, `--no-llms`) to disable features up front.
  - New `voxx add collection <type>` appends a collection to an existing project, `voxx add <feature>` enables a feature and scaffolds its route files, and `voxx remove <feature>` disables a feature and deletes its generated routes.
  - Every command now warns before overwriting existing files and only overwrites with confirmation or `--force`.
  - `robots.txt` is now a toggleable feature (`features.robots`), decoupled from `features.sitemap`. Core exposes a new `defaultFeatures(type)` helper.
