import { dirname, join, relative } from "node:path";
import { type ContentType } from "@prudentbird/voxx-core";
import { readTemplate, render, resolveCoreAsset, type WriteOp } from "./util";
import { type FeatureFlags, type FeatureKey } from "./features";
import { type PlannedCollection } from "./collections";

/** Route group that holds all Voxx-generated routes. */
export const VOXX_GROUP = "(voxx)";

/** Everything the scaffolder needs to place Next route files. */
export interface ScaffoldContext {
  /** Project root (where `voxx.json` lives). */
  readonly cwd: string;
  /** App router directory relative to {@link ScaffoldContext.cwd}, e.g. `"app"`. */
  readonly appDir: string;
  /** Collections to scaffold routes for. */
  readonly collections: readonly PlannedCollection[];
  /** Resolved feature flags gating which route files are written. */
  readonly flags: FeatureFlags;
  /** Whether the project already defines design tokens in a globals stylesheet. */
  readonly hasTokens: boolean;
  /**
   * Whether Voxx owns its own root layout under `(voxx)/layout.tsx`. `false`
   * when nesting under an existing user root layout (the "ignore" path).
   */
  readonly split: boolean;
}

function baseSegmentOf(collection: PlannedCollection): string {
  return collection.basePath.slice(1);
}

function rssPathFor(basePath: string): string {
  return basePath === "/" ? "/rss.xml" : `${basePath}/rss.xml`;
}

function groupDir(cwd: string, appDir: string): string {
  return join(cwd, appDir, VOXX_GROUP);
}

async function op(
  cwd: string,
  target: string,
  tpl: string,
  vars: Record<string, string> = {},
  siteWide?: boolean,
): Promise<WriteOp> {
  return {
    path: target,
    label: relative(cwd, target),
    content: render(await readTemplate(tpl), vars),
    siteWide,
  };
}

/**
 * Computes the design-token import for a collection layout. Voxx routes live in
 * their own root layout when split, so they must pull tokens in explicitly;
 * when nesting under a user root, tokens are inherited unless absent.
 */
function globalsImport(hasTokens: boolean, split: boolean): string {
  if (!hasTokens) return 'import "../_voxx/voxx-globals.css";';
  return split ? 'import "../../globals.css";' : "";
}

/**
 * Builds the per-collection Next route files under `(voxx)/<segment>/`: the
 * nested layout, pages, the `_`-prefixed private helpers, and the RSS route
 * when enabled.
 *
 * @param ctx - Scaffold context.
 * @param collection - The collection to scaffold.
 */
export async function collectionOps(
  ctx: ScaffoldContext,
  collection: PlannedCollection,
): Promise<WriteOp[]> {
  const { cwd, appDir, flags, hasTokens, split } = ctx;
  const { type, name, basePath } = collection;
  const segment = baseSegmentOf(collection);
  const dir = join(groupDir(cwd, appDir), segment);
  const ops: WriteOp[] = [];

  ops.push(
    await op(cwd, join(dir, "layout.tsx"), `${type}/layout.tsx.tpl`, {
      GLOBALS_IMPORT: globalsImport(hasTokens, split),
      BASE_PATH: basePath,
      RSS_PATH: rssPathFor(basePath),
    }),
    await op(cwd, join(dir, "_data.ts"), "shared/data.ts.tpl", {
      COLLECTION_ARG: `{ collection: ${JSON.stringify(name)} }`,
    }),
    await op(
      cwd,
      join(dir, "_content-version.ts"),
      "shared/content-version.ts.tpl",
    ),
    await op(
      cwd,
      join(dir, "_theme-toggle.tsx"),
      "shared/theme-toggle.tsx.tpl",
    ),
  );

  if (type !== "changelog") {
    ops.push(
      await op(
        cwd,
        join(dir, "_on-this-page.tsx"),
        "shared/on-this-page.tsx.tpl",
      ),
      await op(cwd, join(dir, "_metadata.ts"), "shared/metadata.ts.tpl"),
    );
  }

  if (type !== "docs" && flags.rss) {
    ops.push(
      await op(
        cwd,
        join(dir, "rss.xml", "route.ts"),
        "shared/rss-route.ts.tpl",
        {
          DATA_IMPORT: "../_data",
        },
      ),
    );
  }

  if (type === "docs") {
    ops.push(
      await op(cwd, join(dir, "[[...slug]]", "page.tsx"), "docs/page.tsx.tpl"),
      await op(cwd, join(dir, "_doc-page.tsx"), "docs/doc-page.tsx.tpl"),
      await op(cwd, join(dir, "_sidebar-nav.tsx"), "docs/sidebar-nav.tsx.tpl"),
      await op(cwd, join(dir, "_mobile-nav.tsx"), "docs/mobile-nav.tsx.tpl"),
    );
  } else if (type === "changelog") {
    ops.push(
      await op(cwd, join(dir, "page.tsx"), "changelog/page.tsx.tpl"),
      await op(
        cwd,
        join(dir, "_release-item.tsx"),
        "changelog/release-item.tsx.tpl",
      ),
      await op(
        cwd,
        join(dir, "_release-stream.tsx"),
        "changelog/release-stream.tsx.tpl",
      ),
      await op(
        cwd,
        join(dir, "api", "route.ts"),
        "changelog/releases-route.ts.tpl",
        {
          DATA_IMPORT: "../_data",
        },
      ),
    );
  } else {
    ops.push(
      await op(cwd, join(dir, "page.tsx"), "blog/page.tsx.tpl"),
      await op(cwd, join(dir, "[slug]", "page.tsx"), "blog/slug-page.tsx.tpl"),
      await op(cwd, join(dir, "_post-page.tsx"), "blog/post-page.tsx.tpl"),
      await op(cwd, join(dir, "_post-card.tsx"), "blog/post-card.tsx.tpl"),
      await op(cwd, join(dir, "_post-stream.tsx"), "blog/post-stream.tsx.tpl"),
      await op(cwd, join(dir, "api", "route.ts"), "blog/posts-route.ts.tpl", {
        DATA_IMPORT: "../_data",
      }),
    );
  }

  return ops;
}

/**
 * Builds the files shared across collections: the Voxx root layout (when
 * split), the theme stylesheets, instrumentation, and the sitemap, robots, and
 * llms routes for the enabled features. Data imports resolve against the first
 * collection's `_data` module.
 *
 * @param ctx - Scaffold context.
 */
export async function siteWideOps(ctx: ScaffoldContext): Promise<WriteOp[]> {
  const { cwd, appDir, collections, flags, hasTokens, split } = ctx;
  const group = groupDir(cwd, appDir);
  const voxxDir = join(group, "_voxx");
  const segment = baseSegmentOf(collections[0]!);
  const dataFromGroup = `./${segment}/_data`;
  const dataFromRouteDir = `../${segment}/_data`;

  const ops: WriteOp[] = [];

  if (split) {
    ops.push(
      await op(
        cwd,
        join(group, "layout.tsx"),
        "shared/voxx-root-layout.tsx.tpl",
        {},
        true,
      ),
    );
  }

  ops.push({
    path: join(voxxDir, "voxx.css"),
    label: relative(cwd, join(voxxDir, "voxx.css")),
    copyFrom: resolveCoreAsset("theme/voxx.css"),
    siteWide: true,
  });
  if (!hasTokens) {
    ops.push({
      path: join(voxxDir, "voxx-globals.css"),
      label: relative(cwd, join(voxxDir, "voxx-globals.css")),
      copyFrom: resolveCoreAsset("theme/demo-globals.css"),
      siteWide: true,
    });
  }

  ops.push(
    await op(
      cwd,
      join(dirname(join(cwd, appDir)), "instrumentation.ts"),
      "shared/instrumentation.ts.tpl",
      {},
      true,
    ),
  );

  if (flags.sitemap) {
    ops.push(
      await op(
        cwd,
        join(group, "sitemap.ts"),
        "shared/sitemap.ts.tpl",
        {
          DATA_IMPORT: dataFromGroup,
        },
        true,
      ),
    );
  }
  if (flags.robots) {
    ops.push(
      await op(
        cwd,
        join(group, "robots.ts"),
        "shared/robots.ts.tpl",
        {
          DATA_IMPORT: dataFromGroup,
        },
        true,
      ),
    );
  }
  if (flags.llmsTxt) {
    ops.push(
      await op(
        cwd,
        join(group, "llms.txt", "route.ts"),
        "shared/llms-route.ts.tpl",
        {
          DATA_IMPORT: dataFromRouteDir,
        },
        true,
      ),
      await op(
        cwd,
        join(group, "llms-full.txt", "route.ts"),
        "shared/llms-full-route.ts.tpl",
        { DATA_IMPORT: dataFromRouteDir },
        true,
      ),
    );
  }

  return ops;
}

/** Builds the full Next scaffold: every collection's files plus site-wide routes. */
export async function nextScaffoldOps(
  ctx: ScaffoldContext,
): Promise<WriteOp[]> {
  const ops: WriteOp[] = [];
  for (const collection of ctx.collections) {
    ops.push(...(await collectionOps(ctx, collection)));
  }
  ops.push(...(await siteWideOps(ctx)));
  return ops;
}

/**
 * Builds the route files a single file-owning feature contributes, used by
 * `voxx add <feature>`. Returns an empty array for runtime-only features.
 *
 * @param ctx - Scaffold context.
 * @param key - The feature being enabled.
 */
export async function featureAddOps(
  ctx: ScaffoldContext,
  key: FeatureKey,
): Promise<WriteOp[]> {
  const { cwd, appDir, collections } = ctx;
  const group = groupDir(cwd, appDir);
  const segment = baseSegmentOf(collections[0]!);
  const dataFromGroup = `./${segment}/_data`;
  const dataFromRouteDir = `../${segment}/_data`;

  switch (key) {
    case "rss": {
      const ops: WriteOp[] = [];
      for (const collection of collections) {
        if (collection.type === "docs") continue;
        ops.push(
          await op(
            cwd,
            join(group, baseSegmentOf(collection), "rss.xml", "route.ts"),
            "shared/rss-route.ts.tpl",
            { DATA_IMPORT: "../_data" },
          ),
        );
      }
      return ops;
    }
    case "sitemap":
      return [
        await op(cwd, join(group, "sitemap.ts"), "shared/sitemap.ts.tpl", {
          DATA_IMPORT: dataFromGroup,
        }),
      ];
    case "robots":
      return [
        await op(cwd, join(group, "robots.ts"), "shared/robots.ts.tpl", {
          DATA_IMPORT: dataFromGroup,
        }),
      ];
    case "llmsTxt":
      return [
        await op(
          cwd,
          join(group, "llms.txt", "route.ts"),
          "shared/llms-route.ts.tpl",
          {
            DATA_IMPORT: dataFromRouteDir,
          },
        ),
        await op(
          cwd,
          join(group, "llms-full.txt", "route.ts"),
          "shared/llms-full-route.ts.tpl",
          { DATA_IMPORT: dataFromRouteDir },
        ),
      ];
    default:
      return [];
  }
}

/**
 * Returns the absolute paths a file-owning feature occupies, used by
 * `voxx remove <feature>` to delete its route files.
 *
 * @param cwd - Project root.
 * @param appDir - App router directory relative to `cwd`.
 * @param collections - Project collections.
 * @param key - The feature being disabled.
 */
export function featureFilePaths(
  cwd: string,
  appDir: string,
  collections: readonly PlannedCollection[],
  key: FeatureKey,
): string[] {
  const group = groupDir(cwd, appDir);
  switch (key) {
    case "rss":
      return collections
        .filter((c) => c.type !== "docs")
        .map((c) => join(group, baseSegmentOf(c), "rss.xml"));
    case "sitemap":
      return [join(group, "sitemap.ts")];
    case "robots":
      return [join(group, "robots.ts")];
    case "llmsTxt":
      return [join(group, "llms.txt"), join(group, "llms-full.txt")];
    default:
      return [];
  }
}

const SAMPLE_TEMPLATES: Record<
  ContentType,
  (
    today: string,
  ) => Array<[tpl: string, rel: string, vars?: Record<string, string>]>
> = {
  blog: (today) => [
    ["blog/hello-world.md.tpl", `${today}-hello-world.md`, { DATE: today }],
  ],
  docs: () => [
    ["docs/index.md.tpl", "index.md"],
    [
      "docs/getting-started-index.md.tpl",
      join("01-getting-started", "index.md"),
    ],
    [
      "docs/installation.md.tpl",
      join("01-getting-started", "01-installation.md"),
    ],
  ],
  changelog: (today) => [
    ["changelog/release.md.tpl", "0.1.0.md", { DATE: today }],
  ],
};

/**
 * Builds the sample content files for a collection so a fresh project renders
 * something immediately.
 *
 * @param cwd - Project root.
 * @param collection - Collection to seed.
 * @param today - ISO date stamp for dated samples.
 */
export async function sampleContentOps(
  cwd: string,
  collection: PlannedCollection,
  today: string,
): Promise<WriteOp[]> {
  const samples = SAMPLE_TEMPLATES[collection.type](today);
  const ops: WriteOp[] = [];
  for (const [tpl, rel, vars] of samples) {
    const target = join(cwd, collection.dir, rel);
    ops.push(await op(cwd, target, tpl, vars ?? {}));
  }
  return ops;
}
