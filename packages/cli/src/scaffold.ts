import { dirname, join, relative } from "node:path";
import { type ContentType } from "@prudentbird/voxx-core";
import {
  readTemplate,
  render,
  resolveCoreAsset,
  type WriteOp,
} from "./util";
import { type FeatureFlags, type FeatureKey } from "./features";
import { type PlannedCollection } from "./collections";

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
   * Whether a single docs collection should own the app's root layout. Only
   * set for a freshly created Next app with one docs collection.
   */
  readonly isolated: boolean;
}

function baseSegmentOf(collection: PlannedCollection): string {
  return collection.basePath.slice(1);
}

function rssPathFor(basePath: string): string {
  return basePath === "/" ? "/rss.xml" : `${basePath}/rss.xml`;
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
 * Builds the per-collection Next route files: layout, pages, the `_voxx`
 * helpers, theme assets, and the RSS route when enabled.
 *
 * @param ctx - Scaffold context.
 * @param collection - The collection to scaffold.
 */
export async function collectionOps(
  ctx: ScaffoldContext,
  collection: PlannedCollection,
): Promise<WriteOp[]> {
  const { cwd, appDir, flags, hasTokens, isolated } = ctx;
  const { type, name, basePath } = collection;
  const baseSegment = baseSegmentOf(collection);
  const blogDir = join(cwd, appDir, baseSegment);
  const voxxDir = join(blogDir, "_voxx");
  const wroteGlobals = !hasTokens;
  const globalsImport = hasTokens ? "" : 'import "./_voxx/voxx-globals.css";';

  const ops: WriteOp[] = [];

  ops.push({
    path: join(voxxDir, "voxx.css"),
    label: relative(cwd, join(voxxDir, "voxx.css")),
    copyFrom: resolveCoreAsset("theme/voxx.css"),
  });
  if (wroteGlobals) {
    ops.push({
      path: join(voxxDir, "voxx-globals.css"),
      label: relative(cwd, join(voxxDir, "voxx-globals.css")),
      copyFrom: resolveCoreAsset("theme/demo-globals.css"),
    });
  }

  const layoutTpl =
    type === "docs"
      ? isolated
        ? "docs/layout-root.tsx.tpl"
        : "docs/layout.tsx.tpl"
      : `${type}/layout.tsx.tpl`;
  ops.push(
    await op(cwd, join(blogDir, "layout.tsx"), layoutTpl, {
      GLOBALS_IMPORT:
        isolated && hasTokens ? 'import "../globals.css";' : globalsImport,
      BASE_PATH: basePath,
      RSS_PATH: rssPathFor(basePath),
    }),
  );

  ops.push(
    await op(cwd, join(voxxDir, "data.ts"), "shared/data.ts.tpl", {
      COLLECTION_ARG: `{ collection: ${JSON.stringify(name)} }`,
    }),
    await op(
      cwd,
      join(voxxDir, "content-version.ts"),
      "shared/content-version.ts.tpl",
    ),
  );

  if (type !== "changelog") {
    ops.push(
      await op(
        cwd,
        join(voxxDir, "on-this-page.tsx"),
        "shared/on-this-page.tsx.tpl",
      ),
      await op(cwd, join(voxxDir, "metadata.ts"), "shared/metadata.ts.tpl"),
    );
  }

  if (type !== "docs" && flags.rss) {
    ops.push(
      await op(
        cwd,
        join(blogDir, "rss.xml", "route.ts"),
        "shared/rss-route.ts.tpl",
        { DATA_IMPORT: "../_voxx/data" },
      ),
    );
  }

  if (type === "docs") {
    ops.push(
      await op(cwd, join(blogDir, "[[...slug]]", "page.tsx"), "docs/page.tsx.tpl"),
      await op(cwd, join(voxxDir, "doc-page.tsx"), "docs/doc-page.tsx.tpl"),
      await op(cwd, join(voxxDir, "sidebar-nav.tsx"), "docs/sidebar-nav.tsx.tpl"),
      await op(cwd, join(voxxDir, "mobile-nav.tsx"), "docs/mobile-nav.tsx.tpl"),
    );
  } else if (type === "changelog") {
    ops.push(
      await op(cwd, join(blogDir, "page.tsx"), "changelog/page.tsx.tpl"),
      await op(
        cwd,
        join(voxxDir, "release-list.tsx"),
        "changelog/release-list.tsx.tpl",
      ),
    );
  } else {
    ops.push(
      await op(cwd, join(blogDir, "page.tsx"), "blog/page.tsx.tpl"),
      await op(cwd, join(blogDir, "[slug]", "page.tsx"), "blog/slug-page.tsx.tpl"),
      await op(cwd, join(voxxDir, "post-page.tsx"), "blog/post-page.tsx.tpl"),
      await op(cwd, join(voxxDir, "post-list.tsx"), "blog/post-list.tsx.tpl"),
    );
  }

  ops.push(
    await op(cwd, join(voxxDir, "theme-toggle.tsx"), "shared/theme-toggle.tsx.tpl"),
  );

  return ops;
}

/**
 * Builds the site-wide Next files written once per project: instrumentation
 * plus the sitemap, robots, and llms routes for the enabled features. Their
 * data imports resolve against the first collection's `_voxx/data` module.
 *
 * @param ctx - Scaffold context.
 */
export async function siteWideOps(ctx: ScaffoldContext): Promise<WriteOp[]> {
  const { cwd, appDir, collections, flags } = ctx;
  const first = collections[0]!;
  const baseSegment = baseSegmentOf(first);
  const dataFromAppRoot = baseSegment
    ? `./${baseSegment}/_voxx/data`
    : "./_voxx/data";
  const dataFromRouteDir = baseSegment
    ? `../${baseSegment}/_voxx/data`
    : "../_voxx/data";

  const ops: WriteOp[] = [];

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
        join(cwd, appDir, "sitemap.ts"),
        "shared/sitemap.ts.tpl",
        { DATA_IMPORT: dataFromAppRoot },
        true,
      ),
    );
  }
  if (flags.robots) {
    ops.push(
      await op(
        cwd,
        join(cwd, appDir, "robots.ts"),
        "shared/robots.ts.tpl",
        { DATA_IMPORT: dataFromAppRoot },
        true,
      ),
    );
  }
  if (flags.llmsTxt) {
    ops.push(
      await op(
        cwd,
        join(cwd, appDir, "llms.txt", "route.ts"),
        "shared/llms-route.ts.tpl",
        { DATA_IMPORT: dataFromRouteDir },
        true,
      ),
      await op(
        cwd,
        join(cwd, appDir, "llms-full.txt", "route.ts"),
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
  const first = collections[0]!;
  const baseSegment = baseSegmentOf(first);
  const dataFromAppRoot = baseSegment
    ? `./${baseSegment}/_voxx/data`
    : "./_voxx/data";
  const dataFromRouteDir = baseSegment
    ? `../${baseSegment}/_voxx/data`
    : "../_voxx/data";

  switch (key) {
    case "rss": {
      const ops: WriteOp[] = [];
      for (const collection of collections) {
        if (collection.type === "docs") continue;
        ops.push(
          await op(
            cwd,
            join(cwd, appDir, baseSegmentOf(collection), "rss.xml", "route.ts"),
            "shared/rss-route.ts.tpl",
            { DATA_IMPORT: "../_voxx/data" },
          ),
        );
      }
      return ops;
    }
    case "sitemap":
      return [
        await op(cwd, join(cwd, appDir, "sitemap.ts"), "shared/sitemap.ts.tpl", {
          DATA_IMPORT: dataFromAppRoot,
        }),
      ];
    case "robots":
      return [
        await op(cwd, join(cwd, appDir, "robots.ts"), "shared/robots.ts.tpl", {
          DATA_IMPORT: dataFromAppRoot,
        }),
      ];
    case "llmsTxt":
      return [
        await op(
          cwd,
          join(cwd, appDir, "llms.txt", "route.ts"),
          "shared/llms-route.ts.tpl",
          { DATA_IMPORT: dataFromRouteDir },
        ),
        await op(
          cwd,
          join(cwd, appDir, "llms-full.txt", "route.ts"),
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
 * `voxx remove <feature>` to delete its route files. Returns directories for
 * route folders so the whole route is removed.
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
  switch (key) {
    case "rss":
      return collections
        .filter((c) => c.type !== "docs")
        .map((c) => join(cwd, appDir, baseSegmentOf(c), "rss.xml"));
    case "sitemap":
      return [join(cwd, appDir, "sitemap.ts")];
    case "robots":
      return [join(cwd, appDir, "robots.ts")];
    case "llmsTxt":
      return [
        join(cwd, appDir, "llms.txt"),
        join(cwd, appDir, "llms-full.txt"),
      ];
    default:
      return [];
  }
}

const SAMPLE_TEMPLATES: Record<
  ContentType,
  (today: string) => Array<[tpl: string, rel: string, vars?: Record<string, string>]>
> = {
  blog: (today) => [
    ["blog/hello-world.md.tpl", `${today}-hello-world.md`, { DATE: today }],
  ],
  docs: () => [
    ["docs/index.md.tpl", "index.md"],
    ["docs/getting-started-index.md.tpl", join("01-getting-started", "index.md")],
    [
      "docs/installation.md.tpl",
      join("01-getting-started", "01-installation.md"),
    ],
  ],
  changelog: (today) => [["changelog/release.md.tpl", "0.1.0.md", { DATE: today }]],
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
