---
"@prudentbird/voxx-core": patch
"@prudentbird/voxx": patch
---

Rename the `theme.preset` config value from `"shadcn"` to `"default"`.

This is a breaking change with no compatibility shim: existing `voxx.json`
files that set `"preset": "shadcn"` must update the value to `"default"` or
schema validation will fail. Newly scaffolded configs now emit `"default"`.
