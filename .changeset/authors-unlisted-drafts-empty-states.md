---
"@prudentbird/voxx-core": minor
"@prudentbird/voxx": minor
---

Multiple authors, unlisted drafts, dated scaffolding, and friendlier empty states.

- **Authors**: frontmatter `author` now accepts a name, an object with an optional `url`, or a list of either. Posts expose `authors: VoxxAuthor[]`, render a visible byline, and emit every author in Open Graph and JSON-LD.
- **Unlisted drafts**: `drafts` is now tri-state (`false | true | "unlisted"`). `"unlisted"` builds a draft's page so it is reachable by URL for previews while staying out of listings, RSS, sitemap, and llms. `voxx build` warns when `drafts: true` would publish drafts as normal posts.
- **Dated scaffolding**: `voxx init` (blog) scaffolds `YYYY-MM-DD-<slug>.md`, matching `voxx new`.
- **Empty states**: a missing content directory no longer throws — it degrades to an empty state, and empty listings show a helpful hint instead of bare text.
