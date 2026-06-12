import { Effect } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { loadConfigEffect, type LoadConfigOptions } from "./config";
import {
  getPostEffect,
  getPostsEffect,
  type GetPostsEffectOptions,
} from "./content";
import { renderMarkdownEffect, type RenderResult } from "./render";
import { DEFAULT_CONFIG, type Post, type VoxxConfig } from "./types";

type Services = FileSystem.FileSystem | Path.Path;

const run = <A, E>(effect: Effect.Effect<A, E, Services>): Promise<A> =>
  Effect.runPromise(Effect.provide(effect, NodeContext.layer));

export interface GetPostsOptions
  extends GetPostsEffectOptions, LoadConfigOptions {
  config?: VoxxConfig;
}

export function loadConfig(opts?: LoadConfigOptions): Promise<VoxxConfig> {
  return run(loadConfigEffect(opts));
}

export function getPosts(opts: GetPostsOptions = {}): Promise<Post[]> {
  return run(
    Effect.gen(function* () {
      const config = opts.config ?? (yield* loadConfigEffect(opts));
      return yield* getPostsEffect(config, opts);
    }),
  );
}

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
  escapeXml,
} from "./util";

export type {
  VoxxConfig,
  VoxxAuthor,
  ContentType,
  CollectionConfig,
  Post,
  TocItem,
  NavNode,
  SeoData,
  OpenGraphData,
  TwitterData,
} from "./types";
export type { RenderResult } from "./render";
export { resolveCollectionDefaults } from "./config";
export type { CollectionInput, LoadConfigOptions } from "./config";
export type {
  ConfigError,
  InvalidFrontmatter,
  PostNotFound,
  ContentDirMissing,
  RenderError,
  VoxxError,
} from "./errors";
