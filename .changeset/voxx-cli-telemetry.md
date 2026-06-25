---
"@prudentbird/voxx": patch
---

Add anonymous, opt-out per-command usage telemetry and a `voxx telemetry`
command (`status`, `enable`, `disable`). Each command reports a single anonymous
event — the command name, success, duration, and the package/Node/OS versions —
and never arguments, paths, names, or content. A one-time notice prints on first
run.

Opt out with `voxx telemetry disable`, or per-invocation with
`VOXX_TELEMETRY_DISABLED=1`, `DO_NOT_TRACK=1`, or `CI=1`. The shared engine lives
in `@prudentbird/voxx-core/telemetry`.
