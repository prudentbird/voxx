---
"@prudentbird/voxx-core": minor
"@prudentbird/voxx": minor
---

Add a `withVoxx` Next.js config helper (`@prudentbird/voxx-core/next`) that enables Cache Components, marks `@prudentbird/voxx-core` as an external server package, and traces `voxx.json` plus every content directory into the serverless function bundle. This fixes runtime `ConfigError` failures during cache revalidation on platforms that bundle each route into an isolated function.

`voxx init` now wraps the `next.config` default export with `withVoxx` instead of injecting `cacheComponents: true`, and the scaffolded data layer pins cached reads to the `max` lifetime so content refreshes only on redeploy.
