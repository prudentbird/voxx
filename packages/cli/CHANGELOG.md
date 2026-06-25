# @prudentbird/voxx

## 0.0.4

### Patch Changes

- 0b7c4f5: Add anonymous, opt-out per-command usage telemetry and a `voxx telemetry`
  command (`status`, `enable`, `disable`). Each command reports a single anonymous
  event — the command name, success, duration, and the package/Node/OS versions —
  and never arguments, paths, names, or content. A one-time notice prints on first
  run.

  Opt out with `voxx telemetry disable`, or per-invocation with
  `VOXX_TELEMETRY_DISABLED=1`, `DO_NOT_TRACK=1`, or `CI=1`. The shared engine lives
  in `@prudentbird/voxx-core/telemetry`.

- Updated dependencies [68b3c4a]
  - @prudentbird/voxx-core@0.0.4

## 0.0.3

### Patch Changes

- aa2065e: Rename the `theme.preset` config value from `"shadcn"` to `"default"`.

  This is a breaking change with no compatibility shim: existing `voxx.json`
  files that set `"preset": "shadcn"` must update the value to `"default"` or
  schema validation will fail. Newly scaffolded configs now emit `"default"`.

- Updated dependencies [aa2065e]
  - @prudentbird/voxx-core@0.0.3

## 0.0.2

### Patch Changes

- 7a4c526: Overhaul `voxx init` and add feature management commands.

  - `voxx init` is now an interactive wizard: choose static vs. a new Next.js app, scaffold one or more collections in a single run (`voxx init blog docs`), name each collection (e.g. a blog served at `/posts`), set site details, and pick which features to enable from recommended defaults. Pass `--yes` for a headless run and `--no-<feature>` (e.g. `--no-sitemap`, `--no-llms`) to disable features up front.
  - New `voxx add collection <type>` appends a collection to an existing project, `voxx add <feature>` enables a feature and scaffolds its route files, and `voxx remove <feature>` disables a feature and deletes its generated routes.
  - Every command now warns before overwriting existing files and only overwrites with confirmation or `--force`.
  - `robots.txt` is now a toggleable feature (`features.robots`), decoupled from `features.sitemap`. Core exposes a new `defaultFeatures(type)` helper.

- 576b750: Stream the blog and changelog indexes with server-rendered first batches and on-scroll loading.

  Scaffolded apps gain a metadata-aware data layer (`listPosts`, `listReachablePosts`, `getPostsPage`) and resolve a single post through the engine's single-post render. The blog index server-renders the first page of post metadata and appends more from a `/posts` route as you scroll, preserving tag filtering. The changelog does the same from a `/releases` route, with deep links resolved via an `until=<slug>` parameter so a release far down the timeline loads in one request. Docs navigation, prev/next, sitemap, and `llms.txt` now build from metadata instead of rendering every post.

- 0c50a4f: Scaffold all Next.js output into an `app/(voxx)/` route group with a clean root-layout split.

  Every generated route, the shared theme CSS, and each collection's markdown now live under `app/(voxx)/`, with each collection self-contained: routes, underscore-prefixed private modules (`_data.ts`, `_post-list.tsx`, …), and its `_content/` folder side by side. New apps get a `(site)`/`(voxx)` split so Voxx owns its own `<html>`/`<body>` root layout independent of your pages.

  For an existing app, `voxx init` warns that your root layout would wrap Voxx routes and offers to **fix** it (move your layout into a `(site)` group) or **ignore** it (nest under your layout). Non-interactive runs default to ignore + warn; `--isolate` / `--no-isolate` force the choice. This replaces the previous docs-only root-layout special case.

- Updated dependencies [576b750]
- Updated dependencies [7a4c526]
  - @prudentbird/voxx-core@0.0.2
