---
"@prudentbird/voxx-core": patch
"@prudentbird/voxx": patch
---

Bake the PostHog key into the published bundle. The `prepublishOnly`/`prepare`
hooks re-ran `tsdown` (with `clean: true`) during install and publish without
`VOXX_PUBLIC_POSTHOG_KEY` in the environment, overwriting the keyed build from
the release Build step with a telemetry-stripped one. The key is now set at the
release job level so every `tsdown` invocation embeds it.
