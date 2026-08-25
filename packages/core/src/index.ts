import { performance } from "node:perf_hooks";
import { Effect } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { loadConfigEffect, type LoadConfigOptions } from "./config";
import {
  getPostEffect,
  getPostsEffect,
  listPostsEffect,
  type GetPostsEffectOptions,
  type ListPostsResult,
} from "./content";
import { renderMarkdownEffect, type RenderResult } from "./render";
import { recordCoreApiCall, recordCoreUsage } from "./telemetry";
import { DEFAULT_CONFIG, type Post, type VoxxConfig } from "./types";

type Services = FileSystem.FileSystem | Path.Path;

type CoreApi =
  | "loadConfig"
  | "listPosts"
  | "getPosts"
  | "getPost"
  | "getPostOrNull"
  | "renderMarkdown";

const collectionType = (
  opts: GetPostsOptions,
): VoxxConfig["content"]["type"] | undefined => {
  if (!opts.config) return undefined;
  if (!opts.collection) return opts.config.content.type;
  return opts.config.collections?.find((c) => c.name === opts.collection)?.type;
};

const optionsTelemetry = (
  opts: GetPostsOptions,
  reachableDefault = false,
): Record<string, unknown> => ({
  config_source: opts.config
    ? "provided"
    : opts.path
      ? "path"
      : opts.cwd
        ? "cwd"
        : "default",
  content_type: collectionType(opts),
  collection_selected: opts.collection !== undefined,
  include_drafts: opts.includeDrafts === true,
  reachable: opts.reachable ?? reachableDefault,
  filtered_by_tag: opts.tag !== undefined,
  filtered_by_category: opts.category !== undefined,
  paginated: opts.offset !== undefined || opts.limit !== undefined,
});

const configTelemetry = (config: VoxxConfig): Record<string, unknown> => ({
  content_type: config.content.type,
  collection_count: config.collections.length,
  feature_toc: config.features.toc,
  feature_rss: config.features.rss,
  feature_sitemap: config.features.sitemap,
  feature_robots: config.features.robots,
  feature_llms_txt: config.features.llmsTxt,
  feature_tags: config.features.tags,
  feature_reading_time: config.features.readingTime,
});

const lengthBucket = (value: string): string => {
  const length = value.length;
  if (length < 1_000) return "lt_1k";
  if (length < 10_000) return "1k_10k";
  if (length < 100_000) return "10k_100k";
  return "gte_100k";
};

const run = <A, E>(
  api: CoreApi,
  effect: Effect.Effect<A, E, Services>,
  props: Record<string, unknown> = {},
  resultProps: (result: A) => Record<string, unknown> = () => ({}),
): Promise<A> => {
  recordCoreUsage();
  const start = performance.now();
  return Effect.runPromise(Effect.provide(effect, NodeContext.layer)).then(
    (result) => {
      recordCoreApiCall(api, start, true, { ...props, ...resultProps(result) });
      return result;
    },
    (error: unknown) => {
      recordCoreApiCall(api, start, false, props, error);
      throw error;
    },
  );
};

/** Options accepted by `getPosts` and `getPost`. */
export interface GetPostsOptions
  extends GetPostsEffectOptions, LoadConfigOptions {
  /** Pre-loaded config — skips reading `voxx.json` when provided. */
  config?: VoxxConfig;
}

/**
 * Reads and validates `voxx.json` from disk.
 *
 * @param opts - Optional `cwd` or explicit config file `path`.
 * @returns Fully resolved `VoxxConfig`.
 */
export function loadConfig(opts?: LoadConfigOptions): Promise<VoxxConfig> {
  return run(
    "loadConfig",
    loadConfigEffect(opts),
    {
      config_source: opts?.path ? "path" : opts?.cwd ? "cwd" : "default",
    },
    configTelemetry,
  );
}

/**
 * Lists post metadata for the active collection without rendering Markdown,
 * with optional `tag`/`category` filtering and `offset`/`limit` pagination.
 * Returns the requested page plus the unpaginated `total`.
 *
 * Prefer this over {@link getPosts} for indexes, navigation, sitemaps, and
 * feeds that only need metadata — it never renders a post, so it scales to
 * large content sets.
 *
 * @param opts - Filter, pagination, draft visibility, and optional pre-loaded config.
 */
export function listPosts(
  opts: GetPostsOptions = {},
): Promise<ListPostsResult> {
  return run(
    "listPosts",
    Effect.gen(function* () {
      const config = opts.config ?? (yield* loadConfigEffect(opts));
      return yield* listPostsEffect(config, opts);
    }),
    optionsTelemetry(opts),
    (result) => ({
      post_count: result.posts.length,
      total_count: result.total,
    }),
  );
}

/**
 * Returns rendered posts for the active collection, sorted by the collection
 * type's natural order (date, semver, or manual order prefix). Filtering and
 * pagination are applied before rendering, so only the returned posts are
 * rendered to HTML.
 *
 * @param opts - Filter, pagination, draft visibility, and optional pre-loaded config.
 */
export function getPosts(opts: GetPostsOptions = {}): Promise<Post[]> {
  return run(
    "getPosts",
    Effect.gen(function* () {
      const config = opts.config ?? (yield* loadConfigEffect(opts));
      return yield* getPostsEffect(config, opts);
    }),
    optionsTelemetry(opts),
    (posts) => ({ post_count: posts.length }),
  );
}

/**
 * Returns a single post by slug.
 *
 * @param slug - Slash-separated path, e.g. `"getting-started/install"`.
 * @param opts - Collection filter, draft visibility, and optional pre-loaded config.
 * @throws `PostNotFound` if no matching post exists.
 */
export function getPost(
  slug: string,
  opts: GetPostsOptions = {},
): Promise<Post> {
  return run(
    "getPost",
    Effect.gen(function* () {
      const config = opts.config ?? (yield* loadConfigEffect(opts));
      return yield* getPostEffect(config, slug, opts);
    }),
    optionsTelemetry(opts, true),
    () => ({ found: true }),
  );
}

/**
 * Like {@link getPost}, but resolves to `null` when no post matches the slug
 * instead of throwing `PostNotFound`. Render and config failures still reject,
 * so a genuine 404 stays distinct from a broken post or config.
 *
 * @param slug - Slash-separated path, e.g. `"getting-started/install"`.
 * @param opts - Collection filter, draft visibility, and optional pre-loaded config.
 */
export function getPostOrNull(
  slug: string,
  opts: GetPostsOptions = {},
): Promise<Post | null> {
  return run(
    "getPostOrNull",
    Effect.gen(function* () {
      const config = opts.config ?? (yield* loadConfigEffect(opts));
      return yield* getPostEffect(config, slug, opts).pipe(
        Effect.catchTag("PostNotFound", () => Effect.succeed(null)),
      );
    }),
    optionsTelemetry(opts, true),
    (post) => ({ found: post !== null }),
  );
}

/**
 * Converts a Markdown string to HTML with syntax highlighting and TOC extraction.
 *
 * @param markdown - Raw Markdown source.
 * @param config - Voxx config (controls code theme). Defaults to `DEFAULT_CONFIG`.
 */
export function renderMarkdown(
  markdown: string,
  config: VoxxConfig = DEFAULT_CONFIG,
): Promise<RenderResult> {
  return run(
    "renderMarkdown",
    renderMarkdownEffect(markdown, config),
    {
      content_type: config.content.type,
      markdown_length: lengthBucket(markdown),
      feature_toc: config.features.toc,
    },
    (result) => ({ toc_count: result.toc.length }),
  );
}

export { buildSeo } from "./seo";
export { renderRss, renderSitemap, renderRobotsTxt, rssPath } from "./feeds";
export type { RenderRssOptions, RenderSitemapOptions } from "./feeds";
export {
  renderLlmsTxt,
  renderLlmsTxtSections,
  renderLlmsFull,
  sectionHeading,
} from "./llms";
export type { LlmsSection } from "./llms";
export { findPost } from "./content";
export type { ListPostsResult } from "./content";
export { serveContentAsset, VOXX_ASSET_PREFIX, ASSET_DIR } from "./assets";
export { registerContentWatcher } from "./dev";
export type { ContentWatcherOptions } from "./dev";
export { buildNavTree } from "./nav";
export { DEFAULT_CONFIG } from "./types";
export {
  slugify,
  joinPath,
  absoluteUrl,
  readingTimeMinutes,
  deriveExcerpt,
  splitDatePrefix,
  splitOrderPrefix,
  humanize,
  formatDate,
  parseVersion,
  compareVersions,
  escapeXml,
  serializeJsonLd,
  normalizeAuthors,
} from "./util";

export type {
  VoxxConfig,
  VoxxAuthor,
  ContentType,
  CollectionConfig,
  Post,
  PostMeta,
  TocItem,
  NavNode,
  SeoData,
  OpenGraphData,
  TwitterData,
} from "./types";
export type { RenderResult } from "./render";
export { resolveCollectionDefaults, defaultFeatures } from "./config";
export type { CollectionInput, LoadConfigOptions } from "./config";
export type {
  ConfigError,
  InvalidFrontmatter,
  PostNotFound,
  RenderError,
  VoxxError,
} from "./errors";
