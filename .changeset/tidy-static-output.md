---
"@prudentbird/voxx": patch
---

Replace static output on each build so deleted pages, removed collections, assets, and disabled feature files no longer remain published or served by dev. Stage builds before replacement, protect source directories, and require --force to adopt non-empty output without a Voxx build marker.
