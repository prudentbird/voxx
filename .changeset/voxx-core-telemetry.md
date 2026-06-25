---
"@prudentbird/voxx-core": patch
---

Add an anonymous, opt-out usage-telemetry engine, exported from the new
`@prudentbird/voxx-core/telemetry` subpath. The engine emits three event types:

- **`core_used`** — fired at most once per process the first time a public data
  function (`loadConfig`, `getPosts`, `renderMarkdown`, …) or `withVoxx` runs.
- **`core_api_call`** — fired for every instrumented public API call, recording
  the API name, wall-clock duration, success flag, and (on failure) low-cardinality
  error metadata (`error_tag`, `error_name`, `error_code`, `cause_name`,
  `cause_code`). No arguments, paths, slugs, or content are ever included.
- **`core_issue`** — fired when a recoverable internal issue is detected, recording
  a low-cardinality issue name and the same error-metadata shape as above.

Telemetry is anonymous, non-blocking, and privacy-preserving: it sends only a
random install id, the package version, the Node version, and the OS — never
arguments, paths, names, or content. It is a no-op in builds without an embedded
project key and never delays process exit. Opt out with `VOXX_TELEMETRY_DISABLED=1`,
`DO_NOT_TRACK=1`, or `CI=1`.
