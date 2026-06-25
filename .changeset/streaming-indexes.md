---
"@prudentbird/voxx": patch
---

Stream the blog and changelog indexes with server-rendered first batches and on-scroll loading.

Scaffolded apps gain a metadata-aware data layer (`listPosts`, `listReachablePosts`, `getPostsPage`) and resolve a single post through the engine's single-post render. The blog index server-renders the first page of post metadata and appends more from a `/posts` route as you scroll, preserving tag filtering. The changelog does the same from a `/releases` route, with deep links resolved via an `until=<slug>` parameter so a release far down the timeline loads in one request. Docs navigation, prev/next, sitemap, and `llms.txt` now build from metadata instead of rendering every post.
