---
"@prudentbird/voxx-core": patch
---

Fix a frontmatter-parsing regression from the gray-matter removal: an empty
but properly-closed block (`---\n---\nbody`) was mis-split (the opening and
closing fences share a single newline, which the previous regex-based
splitter didn't account for), swallowing the content into the YAML block and
throwing a YAML parse error instead of correctly yielding no frontmatter data.
