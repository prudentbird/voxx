---
"@prudentbird/voxx-core": patch
"@prudentbird/voxx": patch
---

Mark unlisted and preview-only draft pages as noindex, nofollow in static output and generated Next.js metadata. Drafts published with drafts: true remain indexable.

Resolve draft visibility from the post collection in multi-collection configs, and prevent indexing changelog indexes that embed preview-only releases.
