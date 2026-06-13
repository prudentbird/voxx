---
"@prudentbird/voxx-core": minor
"@prudentbird/voxx": minor
---

Add an optional `site.titleHref` config field that controls where the title link points. In the static build, the site header (blog and changelog) and the docs sidebar title now link to `site.titleHref` when set, falling back to the collection `basePath` as before. This is distinct from `site.url` (the canonical origin used for SEO) — `titleHref` is purely the navigation target for the title link, so a blog, docs, or changelog embedded under a larger site can point its title at the parent home (e.g. `"titleHref": "/"`) without post-build `sed` rewrites.
