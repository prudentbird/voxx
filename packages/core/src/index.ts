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
import { recordCoreUsage } from "./telemetry";
import {
  DEFAULT_CONFIG,
  type Post,
  type PostMeta,
  type VoxxConfig,
} from "./types";

type Services = FileSystem.FileSystem | Path.Path;

const run = <A, E>(effect: Effect.Effect<A, E, Services>): Promise<A> => {
  recordCoreUsage();
  return Effect.runPromise(Effect.provide(effect, NodeContext.layer));
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
  return run(loadConfigEffect(opts));
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
    Effect.gen(function* () {
      const config = opts.config ?? (yield* loadConfigEffect(opts));
      return yield* listPostsEffect(config, opts);
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
    Effect.gen(function* () {
      const config = opts.config ?? (yield* loadConfigEffect(opts));
      return yield* getPostsEffect(config, opts);
    }),
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
    Effect.gen(function* () {
      const config = opts.config ?? (yield* loadConfigEffect(opts));
      return yield* getPostEffect(config, slug, opts);
    }),
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
    Effect.gen(function* () {
      const config = opts.config ?? (yield* loadConfigEffect(opts));
      return yield* getPostEffect(config, slug, opts).pipe(
        Effect.catchTag("PostNotFound", () => Effect.succeed(null)),
      );
    }),
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
  return run(renderMarkdownEffect(markdown, config));
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
