---
"@prudentbird/voxx": patch
---

Scaffold all Next.js output into an `app/(voxx)/` route group with a clean root-layout split.

Every generated route, the shared theme CSS, and each collection's markdown now live under `app/(voxx)/`, with each collection self-contained: routes, underscore-prefixed private modules (`_data.ts`, `_post-list.tsx`, …), and its `_content/` folder side by side. New apps get a `(site)`/`(voxx)` split so Voxx owns its own `<html>`/`<body>` root layout independent of your pages.

For an existing app, `voxx init` warns that your root layout would wrap Voxx routes and offers to **fix** it (move your layout into a `(site)` group) or **ignore** it (nest under your layout). Non-interactive runs default to ignore + warn; `--isolate` / `--no-isolate` force the choice. This replaces the previous docs-only root-layout special case.
