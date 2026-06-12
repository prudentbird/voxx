# Design: the fate of `features.tags` / `features.categories`

> Deliverable of plan 007 (decision spike). This is a decision document, not
> an implementation plan — but every claim is grounded in `file:line` so a
> future plan can lift sections of it verbatim into its "Current state".
> Line references are against the working tree at the time plan 007 landed
> (post-001…006, on `dev`).

## 1. Inventory (verified)

Every bullet below was re-verified against the live tree. Two of the audit's
planning-time claims have drifted; both drifts are flagged inline.

### The feature flags

- **Schema accepts both flags**: `packages/core/src/schema.ts:86-87` —
  `tags: Schema.optional(Schema.Boolean)`,
  `categories: Schema.optional(Schema.Boolean)` inside the optional
  `features` struct (`schema.ts:80-90`).
- **Types and defaults carry both**: `packages/core/src/types.ts:41-42`
  (`features.tags` / `features.categories` on `VoxxConfig`);
  `types.ts:151-152` (`DEFAULT_CONFIG` turns both **on**).
- **Config resolution wires them through**:
  `packages/core/src/config.ts:22` and `config.ts:27-28`
  (`TYPE_FEATURE_DEFAULTS` disables both for `docs` and `changelog`);
  `config.ts:94-95` (merge into the resolved config).
- **The JSON schema ships both**: `packages/core/voxx.schema.json` lists
  `tags` and `categories` under `features` with
  `"additionalProperties": false`. It is regenerated on every core build —
  `packages/core/package.json:68`:
  `"build": "tsdown && node ./scripts/gen-schema.ts"`.

### Consumers of `features.tags` — two, both presentational

- `packages/cli/src/commands/build.ts:120-121` — the static builder's index
  page renders a `voxx-tags`/`voxx-tag` chip list per post card when the flag
  is on and the post has tags.
- `packages/cli/templates/blog/post-list.tsx.tpl:31-39` — the scaffolded
  Next.js blog post list renders the same chip list, gated on
  `config.features.tags && post.tags.length > 0`.
  **Drift from the planning-time claim**: the audit said "nothing under
  `packages/cli/templates/` renders `post.tags`" and that `build.ts:120` was
  the *only* consumer. The blog template gained tag rendering since; there
  are now two consumers. Neither links anywhere — the chips are inert text.
- No other consumer: `grep -rn "features.tags" packages apps/web/src` matches
  only the two render sites plus the schema/config/types lines above.

### Consumers of `features.categories` — none (confirmed)

- `grep -rn "categories" packages/core/src packages/cli/src apps/web/src`
  matches only `schema.ts:87`, `types.ts:42`, `types.ts:152`,
  `config.ts:22,28,95`, and a **local variable** in
  `packages/core/src/feeds.ts:25,36` that holds RSS `<category>` elements
  derived from `post.tags` — it never reads the flag or `post.category`.
  The plan's STOP-condition check ("a consumer planning missed") comes up
  empty: the flag is parsed, defaulted, merged, and then read by nothing.

### The frontmatter data (distinct from the flags)

- **Frontmatter accepts both fields**: `packages/core/src/schema.ts:22-26` —
  `tags: string[]` defaulting to `[]` (`schema.ts:22-25`), `category`
  optional string (`schema.ts:26`).
- **`Post` exposes both**: `packages/core/src/types.ts:67-68`; `buildPost`
  copies them (`packages/core/src/content.ts:127-128`).
- **`post.tags` has real consumers, independent of the flag** (the audit's
  inventory under-counted this; the user docs at
  `apps/web/content/docs/02-writing/01-frontmatter.md:37` describe it
  correctly):
  - RSS items emit one `<category>` per tag —
    `packages/core/src/feeds.ts:25-27,36` (not gated on `features.tags`).
  - SEO: Open Graph `article:tag` data (`packages/core/src/seo.ts:35`) and
    JSON-LD `keywords` (`seo.ts:64`), flowing into the scaffolded Next.js
    metadata via `packages/cli/templates/shared/metadata.ts.tpl:23`.
  - `voxx new` scaffolds `tags: []` into blog frontmatter
    (`packages/cli/src/commands/new.ts:219`); the sample blog post ships a
    tag (`packages/cli/templates/blog/hello-world.md.tpl:5`). The docs path
    deliberately omits it (`new.ts:189-197`).
- **`post.category` has zero consumers**: nothing beyond the
  schema/type/copy lines above reads it. It is pure passthrough — visible to
  user code via `Post`, used by no Voxx surface.

### Supporting surfaces

- **No tag/category APIs in core**: `packages/core/src/index.ts:55-103`
  exports `buildSeo`, feeds, llms, `findPost`, `buildNavTree`, util helpers —
  `grep -in "tag\|categor" packages/core/src/index.ts` matches nothing.
- **Theme CSS ships the chip styles**: `packages/core/theme/voxx.css:392-407`
  styles `.voxx-tags` / `.voxx-tag`, so both render sites are styled out of
  the box.
- **User docs document both**:
  `apps/web/content/docs/02-writing/01-frontmatter.md:17-18,37-38` (the
  `tags`/`category` fields — the `tags` row is accurate, the `category` row
  describes a field nothing consumes);
  `apps/web/content/docs/03-reference/01-configuration.md:36-37,81,94` (both
  flags listed, including the per-type defaults table — nothing tells the
  reader `categories` is inert).
- **Dogfooding reality**: `apps/web/voxx.json` is a docs-type,
  single-collection config with no `features` key, so both flags resolve
  **off** via `TYPE_FEATURE_DEFAULTS` (`config.ts:22`). The plan-002 sync
  guard (`packages/cli/test/template-sync.test.ts:16-37`) pairs only
  `docs/*` and `shared/*` templates with `apps/web` — **no blog template is
  dogfooded**, including the one surface that renders tags.
- **Unknown-key behavior (verified empirically, matters for Option B)**:
  Effect's `Schema.Struct` ignores excess properties by default — decoding
  `{ features: { tags: true, categories: true, bogus: 1 } }` against a
  struct without `categories` succeeds and silently drops the extras
  (verified with `Schema.decodeUnknownSync` against `effect` as resolved in
  `packages/core`; `resolveConfig` passes no `onExcessProperty` option,
  `packages/core/src/config.ts:110`). The **editor** experience is the loud
  one: `voxx.schema.json` sets `"additionalProperties": false`, so a removed
  key gets a squiggle in any `$schema`-aware editor —
  `apps/web/voxx.json:2` shows the `$schema` wiring users get from `init`.

## 2. Option A: finish the feature

### Core API

Follow the `buildNavTree(posts)` precedent (`packages/core/src/nav.ts:4-31`)
and `findPost(posts, slug)` (`packages/core/src/content.ts:211-217`): pure,
takes `Post[]`, no I/O, exported from `index.ts`.

```ts
// packages/core/src/tags.ts (new)
export interface TagIndexEntry {
  /** Display form: the first-seen original casing, e.g. "CSS". */
  tag: string;
  /** URL-safe form via the existing slugify (util.ts:1-9), e.g. "css". */
  slug: string;
  /** Posts carrying the tag, in the order given (content.ts sorts by date). */
  posts: Post[];
}

export function buildTagIndex(posts: Post[]): TagIndexEntry[];
```

Semantics:

- Group by `slugify(tag)` so `"CSS"` and `"css"` merge into one entry
  (display form = first occurrence); drop tags whose slug is empty.
- Sort entries by `posts.length` descending, then `slug` ascending — the
  "biggest topics first" order an index page wants, deterministic for tests.
- Export `buildTagIndex` and `TagIndexEntry` from
  `packages/core/src/index.ts` next to `buildNavTree` (`index.ts:66`).

**Categories**: do **not** build a parallel `buildCategoryIndex` pre-1.0.
A `category` is a coarse single tag; `buildTagIndex` subsumes it (a user who
wants category pages can put the category in `tags`). Option A therefore
*still removes* `features.categories` exactly as Option B specifies — the
two options differ only on tags. Keeping a never-rendered second taxonomy
alive "for symmetry" recreates the problem this spike exists to fix.

### Surface plan

| Surface | Change | Effort |
| --- | --- | --- |
| core API | `buildTagIndex` + tests (mirror `nav.ts` / its `core.test.ts` coverage) | **S** |
| static builder | `<basePath>/tags/<slug>/index.html` per entry (title, post-card list reusing `indexBody`'s card markup, `build.ts:112-135`); make the inert chips at `build.ts:120-121` links; add tag pages to the sitemap the builder writes | **S–M** |
| Next.js blog templates | new `tags/[tag]/page.tsx.tpl` route under the blog base (with `generateStaticParams` from `buildTagIndex`); link the chips in `post-list.tsx.tpl:31-39`; per-page metadata via the existing `metadata.ts.tpl` pattern; templates must also land in any future blog dogfood per the sync-guard design (see below) | **M** |
| docs | `01-configuration.md` feature-flag rows + a short "tag pages" section; `01-frontmatter.md` already describes `tags` correctly | **S** |

SEO note: tag pages are a genuine SEO surface (the README's pitch —
`README.md:16`), and `rss.xml` already emits per-post `<category>` elements
(`feeds.ts:25-27`), so the data side needs nothing.

### The dogfooding problem (honest)

Every template surface so far is dogfooded byte-for-byte in `apps/web`
(`template-sync.test.ts:10-15` states the policy). `apps/web` is a docs-type
site where `features.tags` resolves **off** (`config.ts:22`) and no blog
template is in the `PAIRS` list. So Option A's biggest piece — the blog tag
route — **would not be dogfooded** unless the repo first grows a blog
surface in `apps/web` (e.g. a `/blog` collection for release notes /
announcements, which plan 006's `init --add` design would exercise too).
Shipping the feature without that means tag routes are covered only by CLI
scaffold tests (`packages/cli/test/init-typecheck.test.ts` compiles
scaffolded output), not by a running site. That is a real regression in the
project's quality bar and the main argument against doing Option A now.

## 3. Option B: descope

Exactly what changes, in dependency order:

1. **Remove the `categories` flag from the input schema**:
   `packages/core/src/schema.ts:87`.
2. **Remove it from resolution**: `packages/core/src/config.ts:22` (docs
   default), `config.ts:28` (changelog default), `config.ts:95` (merge).
3. **Remove it from the resolved type and defaults**:
   `packages/core/src/types.ts:42` (`VoxxConfig.features`), `types.ts:152`
   (`DEFAULT_CONFIG`).
4. **Regenerate `voxx.schema.json`** — automatic: the file is rebuilt by
   `node ./scripts/gen-schema.ts` on every `pnpm --filter @voxx/core build`
   (`packages/core/package.json:68`). The regenerated schema drops
   `categories` from `features.properties`; with
   `"additionalProperties": false` editors will flag the stale key.
5. **Keep `tags`** (flag + frontmatter) and fix its documentation:
   `apps/web/content/docs/03-reference/01-configuration.md:81,94` should say
   the flag gates **post-card tag chips** (static-builder index page and the
   scaffolded blog post list) and nothing else — RSS categories and SEO
   keywords flow from frontmatter `tags` regardless of the flag
   (`feeds.ts:25-27`, `seo.ts:35,64`).
6. **Keep `category` in frontmatter/`Post`** (`schema.ts:26`,
   `types.ts:68`, `content.ts:128`) but annotate it in
   `apps/web/content/docs/02-writing/01-frontmatter.md:38` as passthrough:
   "exposed on `Post` for your own components; no built-in Voxx surface
   reads it". Rationale: it is user *data* with a public API surface
   (`Post.category`), unlike the flag, which is config that promises
   behavior. Removing it would break user components for zero gain. (If the
   maintainer prefers a cleaner cut, see Open question 1.)

### Breaking-change blast radius

- **Runtime: silent and safe.** Effect `Schema.Struct` ignores unknown keys
  by default (verified — section 1), so every existing `voxx.json` with
  `"categories": true|false` keeps loading with zero behavior change (the
  flag already did nothing). No load-time error, no migration needed.
- **Editor: loud and proportionate.** `voxx.schema.json` has
  `additionalProperties: false`, so `$schema`-wired configs (`init` writes
  the wiring; see `apps/web/voxx.json:2`) get an "unknown property" squiggle
  — exactly the right volume for "delete this dead key".
- **Types: compile-time only.** `VoxxConfig["features"]` loses `categories`;
  any user TS code reading `config.features.categories` breaks at compile
  time. Pre-1.0, with zero documented behavior behind it, that population is
  approximately nobody.
- **Templates/CLI: no change needed.** Nothing in `packages/cli` or the
  templates references `categories` (section 1 grep).
- Changelog entry: "removed `features.categories` (was accepted but never
  read)". Pre-1.0 semver: a minor bump is defensible; call it out either way.

## 4. Recommendation

**Option B now; revisit tags-as-pages (Option A) only after `apps/web` has a
blog surface to dogfood it on.** Concretely: remove `features.categories`
(steps 1–4 above), keep `tags` and document its real, narrower contract
(steps 5–6).

Rationale, against the project's stated positioning:

- **"Zero-friction" cuts both ways** (`README.md:3`). A config flag that
  validates, defaults per content type, and does nothing is anti-friction-
  negative: the user sets `"categories": true`, sees nothing, and either
  files a bug or stops trusting the config. Deleting it costs one schema
  line; finishing it costs a taxonomy design nobody has asked for.
- **The SEO pitch is already served without tag pages**
  (`README.md:16` "SEO that's just on"): frontmatter `tags` flow into RSS
  `<category>` (`feeds.ts:25-27`), Open Graph article tags (`seo.ts:35`),
  and JSON-LD keywords (`seo.ts:64`) today, unconditionally. Tag *pages*
  would add an indexable surface, but they are the one part of Option A that
  cannot currently be dogfooded (section 2) — and "every surface is
  dogfooded in `apps/web`" is the discipline that made plans 002/003 worth
  doing. Shipping un-dogfooded routes to chase marginal SEO inverts the
  project's own priorities.
- **The asymmetry between the two flags is the decision.** `tags` is half
  real (two styled render sites, scaffolded frontmatter, RSS/SEO flow) and
  cheap to keep honest by documentation. `categories` is 0% real — no
  consumer, no scaffold, no CSS hook, no test. Finish-or-cut applies per
  flag, and the answers differ.
- **Option A stays cheap to do later.** `buildTagIndex` (section 2) is a
  pure function over `Post[]`; nothing in Option B forecloses it. The right
  trigger is the first blog dogfood in `apps/web` (which plan 006's
  `init --add` design would also exercise) — at that point the sync guard
  can grow blog pairs and tag routes ship with real coverage.

## 5. Open questions

Each with a recommended default; none block Option B.

1. **Drop `category` from frontmatter/`Post` too?** Recommended default:
   **keep it** (section 3 step 6) — it is exposed user data, not dead
   config, and `Schema.Struct`'s ignore-unknown default means even removal
   wouldn't break existing markdown files, only TS consumers of
   `Post.category`. If the maintainer wants the fully minimal pre-1.0
   surface, removing it is a 3-line change (`schema.ts:26`, `types.ts:68`,
   `content.ts:128`) plus the docs row — decide once, before 1.0.
2. **Warn at load when a config still contains `categories`?** Recommended
   default: **no**. The runtime ignores unknown keys wholesale; special-
   casing one key means custom pre-decode sniffing in `resolveConfig`
   (`config.ts:107-119`) for a flag that never did anything. The editor
   squiggle from the regenerated schema is the right channel.
3. **Should `features.tags: false` also strip tags from RSS/OG/JSON-LD?**
   Recommended default: **no** — keep the flag presentation-only and say so
   in the docs (Option B step 5). Frontmatter data flowing to feeds/SEO is
   the documented behavior (`01-frontmatter.md:37`) and stripping it would
   hurt the SEO-by-default pitch.
4. **If/when Option A happens: tag URL namespace?** Recommended default:
   `<basePath>/tags/<slug>/` — and note the static builder writes post pages
   at `<basePath>/<slug>/`, so a post slugged `tags` would collide; reserve
   the segment (reject/warn in `voxx new` and the loaders) as part of that
   plan, not now.
5. **If/when Option A happens: tag dedup rule?** Recommended default: group
   case-insensitively by `slugify(tag)` with first-seen casing as display
   form (section 2) — matches how slugs are derived everywhere else
   (`util.ts:1-9`).

## Prior art in this repo

- `plans/design/init-add.md` — plan 006's design doc; section 5 there
  ("naming-contract smell") is the template for how Option A's core helper
  should be introduced when built.
- `packages/cli/test/template-sync.test.ts` — the dogfood policy any new
  template surface must satisfy.
- `packages/core/test/core.test.ts:48,89,432` — existing fixtures already
  carry `tags`, so `buildTagIndex` tests can reuse them.
