---
"@prudentbird/voxx-core": patch
---

Drop the unmaintained `gray-matter` dependency and parse frontmatter with
`js-yaml` directly. `gray-matter@4.0.3` calls the removed `yaml.safeLoad` API
internally, so any consumer whose lockfile resolves a hoisted `js-yaml@4.x`
for it crashed with `Function yaml.safeLoad is removed in js-yaml 4` during
frontmatter parsing. Frontmatter splitting behavior (including unterminated
`---` blocks) matches gray-matter's output exactly.
