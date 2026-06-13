---
"@prudentbird/voxx-core": minor
"@prudentbird/voxx": minor
---

Add an optional `site.titleHref` config field that controls where the header / sidebar title link points. The title now links to `site.titleHref` when set and defaults to the site root (`"/"`) otherwise — across the static build (blog, changelog, and docs) and the scaffolded Next.js layouts, so both stay in sync. This is distinct from `site.url` (the canonical origin used for SEO); `titleHref` is purely the navigation target, so a blog, docs, or changelog embedded under a larger site points its title at the parent home without post-build `sed` rewrites.

Blog post pages now also render a "All posts" back link above the article title that returns to the collection index, so in-collection navigation no longer depends on the title link's destination.

When `titleHref` is left unset (defaulting to `/`) and no collection is served at the root, `voxx build` now warns that the `/` route won't exist and points you to set `site.titleHref` — relevant for a standalone blog served under a subpath like `/blog`.
