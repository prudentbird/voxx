import "server-only";
import { cacheLife } from "next/cache";
import {
  findPost,
  getPost as coreGetPost,
  getPosts as coreGetPosts,
  listPosts as coreListPosts,
  loadConfig as coreLoadConfig,
  type ListPostsResult,
  type Post,
  type PostMeta,
  type VoxxConfig,
} from "@prudentbird/voxx-core";
import { CONTENT_VERSION } from "./_content-version";

/** Filters and pagination accepted by {@link listPosts}. */
export interface ListOptions {
  /** Keep only posts tagged with this value. */
  tag?: string;
  /** Skip this many posts from the start of the sorted, filtered set. */
  offset?: number;
  /** Cap the result to this many posts. */
  limit?: number;
}

async function listPostsCached(
  version: number,
  opts: ListOptions,
): Promise<ListPostsResult> {
  "use cache";
  cacheLife("max");
  void version;
  return coreListPosts({ collection: "docs", ...opts });
}

/**
 * Lists post metadata (no rendered HTML) with optional tag filtering and
 * pagination, plus the unpaginated total. Cheap enough to scale to large
 * content sets — use it for navigation, sitemaps, and feeds.
 */
export async function listPosts(
  opts: ListOptions = {},
): Promise<ListPostsResult> {
  return listPostsCached(CONTENT_VERSION, opts);
}

async function listReachablePostsCached(version: number): Promise<PostMeta[]> {
  "use cache";
  cacheLife("max");
  void version;
  const { posts } = await coreListPosts({
    collection: "docs",
    reachable: true,
  });
  return posts;
}

/** Metadata for every reachable post — used to enumerate static params. */
export async function listReachablePosts(): Promise<PostMeta[]> {
  return listReachablePostsCached(CONTENT_VERSION);
}

async function getPostsCached(version: number): Promise<Post[]> {
  "use cache";
  cacheLife("max");
  void version;
  return coreGetPosts({ collection: "docs" });
}

/**
 * Every post rendered to HTML. Reserved for consumers that genuinely need the
 * full corpus rendered (e.g. `llms-full.txt`).
 */
export async function getPosts(): Promise<Post[]> {
  return getPostsCached(CONTENT_VERSION);
}

async function getConfigCached(version: number): Promise<VoxxConfig> {
  "use cache";
  cacheLife("max");
  void version;
  return coreLoadConfig();
}

export async function getConfig(): Promise<VoxxConfig> {
  return getConfigCached(CONTENT_VERSION);
}

async function getPostCached(
  version: number,
  slug: string,
): Promise<Post | null> {
  "use cache";
  cacheLife("max");
  void version;
  // Resolve existence from metadata first: a genuine render or config failure
  // then surfaces as an error instead of being misreported as a 404.
  const { posts } = await coreListPosts({
    collection: "docs",
    reachable: true,
  });
  if (!findPost(posts, slug)) return null;
  return coreGetPost(slug, { collection: "docs", reachable: true });
}

/** A single post rendered to HTML, or `null` when no slug matches. */
export async function getPost(slug: string): Promise<Post | null> {
  return getPostCached(CONTENT_VERSION, slug);
}
