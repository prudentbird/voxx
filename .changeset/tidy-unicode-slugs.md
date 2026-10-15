---
"@prudentbird/voxx-core": patch
"@prudentbird/voxx": patch
---

Preserve Unicode letters, numbers, and script marks in slugs so non-Latin content filenames and `voxx new` titles produce distinct URLs and static output paths. Decode URL-encoded slug segments during content lookup, including Next route params, while preserving ASCII slug generation and Latin accent normalization.
