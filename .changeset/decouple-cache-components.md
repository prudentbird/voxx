---
"@prudentbird/voxx-core": patch
"@prudentbird/voxx": patch
---

Stop forcing Cache Components on host apps.

`withVoxx` no longer sets `cacheComponents`. It now wires only the serverless plumbing every Voxx app needs (`serverExternalPackages` and content `outputFileTracingIncludes`) and leaves the app's rendering mode entirely to the host. The `cacheComponents` flag passes through untouched like any other config field.

`voxx init` scaffolds one of two data layers. The default static variant memoizes filesystem reads per deploy and needs no rendering-mode changes. The Cache Components variant (the previous `"use cache"` layer) is selected automatically when the host next.config enables `cacheComponents: true`, and can be forced either way with `--cache-components` / `--no-cache-components`.

Breaking change: existing scaffolds that rely on the cached data layer must set `cacheComponents: true` in their own next.config, because `withVoxx` no longer enables it.
