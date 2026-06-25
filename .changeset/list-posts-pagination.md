---
"@prudentbird/voxx-core": patch
---

Add `listPosts` for metadata-only listing with filtering and pagination.

Post processing now separates `PostMeta` (frontmatter-derived fields) from the rendered `Post`, so listing, sorting, filtering, and pagination never render Markdown. `listPosts` returns a paginated page of metadata plus the unpaginated total; `getPosts` gains the same `tag`/`category` filtering and `offset`/`limit` options and renders only what it returns; `getPost` renders just the matched post instead of the whole collection. `buildSeo`, `buildNavTree`, `renderSitemap`, and `renderLlmsTxt` now accept `PostMeta`.
