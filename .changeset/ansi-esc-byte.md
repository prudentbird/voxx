---
"@prudentbird/voxx": patch
---

Fix CLI color output emitting literal ANSI escape codes (e.g. `[32m`) instead of applying color, by including the leading ESC byte in all color sequences.
