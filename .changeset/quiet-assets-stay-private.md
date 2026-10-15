---
"@prudentbird/voxx-core": patch
"@prudentbird/voxx": patch
---

Restrict static content asset copying to the same shared security rules as the Next.js asset route: only files below `assets/`, no dot-files or dot-directories at any depth, and no Markdown sources (case-insensitive). Symlink targets must remain inside the collection and still be visible asset paths.

Behavior change: static builds no longer publish non-Markdown files outside `assets/`. Move any downloads you relied on there into an `assets/` directory and update their references.
