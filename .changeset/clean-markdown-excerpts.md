---
"@prudentbird/voxx-core": patch
---

Derive plain-text excerpts from the Markdown AST so HTML, reference definitions, tables, and footnotes do not leak into descriptions, while preserving literal punctuation and link labels.

Preserve inline HTML line breaks as spaces and cache excerpts within bounded source and entry limits so repeated metadata scans avoid reparsing unchanged posts.
