# Design: `voxx init --add <preset>`

> Deliverable of plan 006 part B. This is a design document, not an
> implementation plan — but every claim is grounded in `file:line` so a future
> plan can lift sections of it verbatim into its "Current state".
> Line references are against the working tree at the time plan 006 landed
> (post-001/002/003/004/005/006-part-A).

## 1. Goal

`voxx init --add <preset>` run in a directory that already has a `voxx.json`
should:

1. Append a new collection entry to the config — migrating a
   single-collection `content: {...}` config to a `collections: [...]` array
   when needed (section 2).
2. Scaffold **only the new collection's** content samples and routes, leaving
   site-wide files (sitemap, robots, llms routes) untouched (section 4).
3. Fail loudly on collisions (section 3) instead of silently doing nothing.

Today none of that exists. `voxx init` always renders `voxx.json` from
`shared/voxx.json.tpl` with a single `content` object
(`packages/cli/src/commands/init.ts:266-280`,
`packages/cli/templates/shared/voxx.json.tpl`), and `writeFileSafe` skips any
existing file unless `--force` (`packages/cli/src/util.ts:48-57`). So
re-running `voxx init docs` on an existing blog site prints
`voxx.json (exists, skipped)` and scaffolds docs routes that point at a
collection the config does not define — worse than a no-op. `--force` is no
escape hatch either: it would *overwrite* `voxx.json`, losing the blog.

The preset argument keeps its current vocabulary and validation:
`PRESETS = ["blog", "docs", "changelog"]`
(`packages/cli/src/commands/init.ts:28`), unknown presets error out
(`init.ts:222-229`).

Proposed invocation surface (mirrors the existing flags at `init.ts:211-220`):

```
voxx init --add docs [--name <name>] [--dir <content/docs>] [--base </docs>] [--app <dir>]
```

`--add` requires an existing `voxx.json`; without one it errors with a hint to
run plain `voxx init <preset>` first. `--force` and `--add` together should be
rejected — `--add` must never overwrite (recommendation; see section 6, Q4).

## 2. Config migration semantics

This is the hard part. There are two input shapes
(`packages/core/src/schema.ts:53-60` for `content`, `:62-71` for
`collections`), and core's `mergeCollections`
(`packages/core/src/config.ts:32-57`) defines the canonical defaulting:

```ts
// config.ts:35-45 — the naming contract
const type = c.type ?? "blog";
const name = c.name ?? type;
return {
  name,
  type,
  dir: c.dir ?? `content/${name}`,
  basePath: c.basePath ?? `/${name}`,
  drafts: c.drafts ?? false,
};
```

Note `collections` **wins over** `content` when both are present and
non-empty (`config.ts:34`); `content` is only consulted as a fallback
(`config.ts:47-56`).

### Rewrite rules

Given an existing `voxx.json` parsed as JSON (`cfg`), and a new entry built
from the `--add` preset + flags (`next`):

1. **Already multi-collection** (`cfg.collections` is a non-empty array):
   push `next` onto the array. Do not touch existing entries — in particular,
   do **not** back-fill their omitted `name`/`dir`/`basePath`; core already
   defaults those at load time and rewriting them is gratuitous churn.
2. **Single-collection** (`cfg.content` present, no `collections`): rewrite to

   ```jsonc
   {
     "collections": [
       { "name": <content.type ?? "blog">, ...cfg.content },  // entry 1: old content, name back-filled
       { "name": ..., "type": ..., "dir": ..., "basePath": ... } // entry 2: the new preset
     ]
   }
   ```

   The first entry copies `cfg.content` verbatim (type/dir/basePath/drafts as
   written, including omissions) **plus** an explicit `name` back-filled per
   core's `name ?? type` rule (`config.ts:37`). Back-filling `name` is the one
   deviation from "copy verbatim", and it is required: once a second
   collection exists, users will pass `--collection <name>` to `voxx new`
   (`packages/cli/src/commands/new.ts:22-50`) and `getPosts({ collection })`
   (`packages/core/src/content.ts:148-160`), so the name should be visible in
   the file rather than implicit. The `content` key is then **removed** —
   leaving both would be confusing even though core ignores `content` when
   `collections` is non-empty.
3. **Neither key present** (valid: core defaults to a blog at `content/`,
   `config.ts:47-56`): treat as case 2 with a synthesized first entry
   `{ "name": "blog" }` — minimal, since core fills the rest.

The new entry (`next`) is written **explicitly** — all of `name`, `type`,
`dir`, `basePath` — even where they equal core's defaults. Rationale: `init`'s
own template already writes explicit values for the single-collection case
(`voxx.json.tpl` writes `type`/`dir`/`basePath`/`drafts`), and explicitness is
what makes the collision checks in section 3 reviewable in the diff.

### Formatting and key order

JSON has no comments, so there is nothing to preserve on that front. The
rewrite should:

- Parse with `JSON.parse`, mutate the object, and write back with
  `JSON.stringify(cfg, null, 2)` + trailing newline — matching how `voxx new`
  reads the file (`new.ts:26-28`) and the 2-space indent of the template.
- Preserve top-level key order by inserting `collections` at the index where
  `content` was (object key order survives `JSON.parse`/`stringify` for
  non-numeric keys, so deleting `content` and rebuilding the object with
  `collections` in its slot is sufficient).
- Users who hand-format their `voxx.json` (4-space indent, aligned values)
  will lose that formatting. Acceptable; call it out in the command's output
  ("rewrote voxx.json"). A `detect-indent`-style dependency is not warranted
  for a config this small (see section 6, Q3).

## 3. Collision rules

Collisions are computed on the **resolved** collection list (existing entries
run through the `name ?? type`, `dir ?? content/<name>`,
`basePath ?? /<name>` defaulting from `config.ts:35-44`) plus the new entry —
otherwise `--add docs` on a config whose first entry is an implicit
`{ }` blog would miss that both resolve `basePath: "/blog"` vs `"/docs"` fine
but `--add blog` would not.

| Collision | Decision | Rationale |
| --- | --- | --- |
| duplicate `name` | **Error out** | `name` is the lookup key for `voxx new --collection` (`new.ts:36-44`) and `getPosts({ collection })` (`content.ts:148-160`); duplicates make the second entry unreachable. Auto-suffixing (`docs-2`) silently creates a name the user never chose and will type wrong forever. Error message should mirror core's convention: `Collection "docs" already exists — defined: blog, docs. Pass --name <other>.` |
| duplicate `basePath` | **Error out** | Two collections on one `basePath` means colliding routes and colliding feed URLs (`init.ts:377-384` mounts `rss.xml` under the base). There is no sane auto-resolution. Suggest `--base` in the message. |
| duplicate `dir` | **Error out** | Two collections sharing a content dir double-renders every file under both `basePath`s. Conceivably intentional (same content, two surfaces) but exotic enough that the user should restructure by hand. Suggest `--dir` in the message. |

Recommendation: all three are hard errors (`process.exitCode = 1`, no files
written — validate **before** any scaffolding so a failed `--add` leaves the
project untouched). No auto-suffix anywhere: `init` is run once per
collection, interactively; an error with a flag suggestion costs the user five
seconds, whereas a surprise auto-name costs them a rename across config,
routes directory, and content dir.

## 4. Route scaffolding scope

Derived from the `templated` array construction in
`packages/cli/src/commands/init.ts:340-404` and the asset copies at
`init.ts:325-338`. `blogDir` is `<appDir>/<baseSegment>` and `voxxDir` is
`<blogDir>/_voxx` (`init.ts:313-314`), so everything rooted there is already
per-collection by construction.

**Per-collection — scaffold these for the new collection** (paths under the
new collection's base segment):

- `<base>/layout.tsx` (`init.ts:341-345`)
- `<base>/_voxx/data.ts` (`init.ts:346`) — note `shared/data.ts.tpl` calls
  `getPosts`/`getConfig` for the *whole site*; the `--add` implementation must
  decide whether the per-collection copy pins `{ collection: <name> }`
  (section 6, Q2)
- `<base>/_voxx/voxx.css` and (conditionally) `voxx-globals.css`
  (`init.ts:325-338`)
- non-changelog: `<base>/_voxx/on-this-page.tsx`, `<base>/_voxx/metadata.ts`
  (`init.ts:350-352`)
- non-docs: `<base>/rss.xml/route.ts` (`init.ts:377-384`)
- preset pages: docs → `[[...slug]]/page.tsx`, `doc-page.tsx`,
  `sidebar-nav.tsx` (`init.ts:386-391`); changelog → `page.tsx`,
  `release-list.tsx` (`init.ts:392-396`); blog → `page.tsx`,
  `[slug]/page.tsx`, `post-page.tsx`, `post-list.tsx` (`init.ts:397-404`)
- content samples for the preset (`init.ts:282-308`) into the new
  collection's `dir`

**Site-wide — already present, `--add` must NOT write or overwrite:**

- `<appDir>/sitemap.ts` and `<appDir>/robots.ts` (`init.ts:353-363`) — note
  these are *skipped* today for the changelog preset (`init.ts:349`); `--add`
  on a changelog-first site may legitimately need to create them
  (section 6, Q5)
- `<appDir>/llms.txt/route.ts` and `<appDir>/llms-full.txt/route.ts`
  (`init.ts:365-376`)
- `next.config` `cacheComponents` enablement (`init.ts:414-417` /
  `enableCacheComponents` at `init.ts:171-208`) — idempotent already (checks
  for the key at `init.ts:193`), safe to re-run, but it is site-wide
- `voxx.json` itself — handled by section 2's merge, not by `writeFileSafe`

The existing `writeFileSafe` skip behavior is the wrong tool for the site-wide
set under `--add`: "skip and report" is correct, but the report should say
"site-wide, already present" rather than implying a failed write. Cosmetic;
the mechanism can stay.

## 5. The naming-contract smell

After plan 006 part A, the `name ?? type` / `dir ?? content/<name>` defaulting
exists in **two places**:

- `packages/core/src/config.ts:35-44` (`mergeCollections`) — the owner
- `packages/cli/src/commands/new.ts:29-35` (`readContentConfig`) — a mirror,
  with a comment pointing at the owner

`init --add` would make it **three** (section 3's collision checks resolve
defaults the same way). That is the threshold where consolidation pays.

Recommendation: core should export a small, **pure, Effect-free** helper —

```ts
// packages/core/src/config.ts (new export)
export function resolveCollectionDefaults(
  c: { name?: string; type?: ContentType; dir?: string; basePath?: string; drafts?: boolean },
): { name: string; type: ContentType; dir: string; basePath: string; drafts: boolean }
```

— refactor `mergeCollections` to call it, and have both `new.ts` and the
future `init --add` import it.

Trade-off, and why part A did not do this: `voxx new`'s fast path deliberately
avoids loading core's Effect machinery — it reads `voxx.json` with plain
`node:fs` (`new.ts:26-28`) instead of `loadConfig`, keeping startup cheap and
dependency-light. But that argument applies to the Effect *runtime*, not to a
pure function. `@voxx/core`'s module graph pulls `effect` at import time
regardless of which export you use, so the real cost question is "does
importing `@voxx/core` at all slow `voxx new` down" — and the CLI already
imports `parseVersion`/`slugify`/`splitDatePrefix`/`splitOrderPrefix` from
`@voxx/core` (`new.ts:5-10`), so that cost is already paid. Verdict: export
the helper from core when `init --add` is built; the mirror in `new.ts`
becomes a one-line import and the contract gets a single owner. If bundle-size
measurement ever shows the core import hurting CLI startup, the alternative is
a shared internal package, not a third copy.

## 6. Open questions for the maintainer

Each with a recommended default; none block starting implementation.

1. **Flag shape: `voxx init --add docs` vs subcommand `voxx add docs`?**
   Recommend the flag — it keeps all scaffolding logic in `init.ts`, reuses
   its flag set (`--dir`, `--base`, `--app`), and the README already brands
   `init` as the scaffolder. A subcommand can alias to it later.
2. **Should the per-collection `data.ts` pin its collection?** The current
   `shared/data.ts.tpl` exposes site-wide `getPosts`. For multi-collection
   sites the scaffolded routes under `<base>/` almost certainly want
   `getPosts({ collection: "<name>" })`. Recommend: yes, render the collection
   name into the template (new template variable, e.g. `{{COLLECTION_ARG}}`),
   and back-port the same pinning to the plain-`init` path where the single
   collection's name is known — behavior is identical for one collection.
3. **Formatting preservation for `voxx.json`?** Recommend plain
   `JSON.stringify(cfg, null, 2)` (section 2). Adding an indent-detection
   dependency for a ~25-line config is not worth it.
4. **`--add` + `--force` interaction?** Recommend: reject the combination.
   `--force` means "overwrite scaffolded files"; combined with a config
   *merge* it creates a mode where routes are clobbered but config is merged —
   too surprising. Users who want a clean re-scaffold can delete and re-init.
5. **Adding a non-changelog collection to a changelog-only site:** the site
   lacks `sitemap.ts`/`robots.ts` (skipped at `init.ts:349`). Recommend:
   `--add` writes site-wide files that are *missing and required by the new
   preset* (via the existing `writeFileSafe` skip semantics, which handle the
   already-present case for free), so the site-wide set converges to the union
   of what its presets need.
6. **Does `--add` touch `features`?** Type-level feature defaults are keyed
   off the **first** collection only (`config.ts:62-66`,
   `TYPE_FEATURE_DEFAULTS` at `config.ts:17-30`) — e.g. a docs-first site has
   `rss: false` globally even after `--add blog`. That is a core semantics
   question, not an init question. Recommend: `--add` leaves `features` alone
   and the command's "Next steps" output mentions checking feature flags;
   fixing per-collection features in core is a separate (larger) design.

## Prior art in this repo

- Multi-collection `voxx.json` shape used by tests:
  `packages/cli/test/commands.test.ts:101-108` (build) and the
  `voxx new --collection` cases added by plan 006 part A.
- Error-message convention for unknown collections:
  `packages/core/src/content.ts:152-159`.
- The dogfooding config `apps/web/voxx.json` is a live single-collection
  (docs) example that `--add blog` should be able to migrate.
