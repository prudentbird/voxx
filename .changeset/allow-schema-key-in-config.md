---
"@prudentbird/voxx-core": patch
---

Allow the `$schema` key in `voxx.json`. The generated config schema had `additionalProperties: false` at the root without whitelisting `$schema`, so configs referencing the schema for IDE support failed validation. `$schema` is now an accepted optional property in both the generated JSON schema and runtime decoding.
