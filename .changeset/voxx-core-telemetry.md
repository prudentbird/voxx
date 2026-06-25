---
"@prudentbird/voxx-core": patch
---

Add an anonymous, opt-out usage-telemetry engine, exported from the new
`@prudentbird/voxx-core/telemetry` subpath. The engine reports a single
`core_used` event per process the first time a data function (`loadConfig`,
`getPosts`, `renderMarkdown`, …) or `withVoxx` runs.

Telemetry is anonymous, non-blocking, and privacy-preserving: it sends only a
random install id, the package version, the Node version, and the OS — never
arguments, paths, names, or content. It is a no-op in builds without an embedded
project key and never delays process exit. Opt out with `VOXX_TELEMETRY_DISABLED=1`,
`DO_NOT_TRACK=1`, or `CI=1`.
