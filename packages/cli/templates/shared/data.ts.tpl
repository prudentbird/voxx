import "server-only";
import { cacheLife } from "next/cache";
import {
  getPostOrNull as coreGetPostOrNull,
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
  return coreListPosts({ ...{{COLLECTION_ARG}}, ...opts });
}

/**
 * Lists post metadata (no rendered HTML) with optional tag filtering and
 * pagination, plus the unpaginated total. Cheap enough to scale to large
 * content sets — use it for indexes, navigation, sitemaps, and feeds.
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
    ...{{COLLECTION_ARG}},
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
  return coreGetPosts({{COLLECTION_ARG}});
}

/**
 * Every post rendered to HTML. Reserved for consumers that genuinely need the
 * full corpus rendered (RSS, `llms-full.txt`).
 */
export async function getPosts(): Promise<Post[]> {
  return getPostsCached(CONTENT_VERSION);
}

async function getPostsPageCached(
  version: number,
  offset: number,
  limit: number,
): Promise<Post[]> {
  "use cache";
  cacheLife("max");
  void version;
  return coreGetPosts({ ...{{COLLECTION_ARG}}, offset, limit });
}

/**
 * A rendered slice of posts. Only the requested window is rendered to HTML, so
 * this powers "load more" / infinite-scroll listings without rendering the
 * whole collection.
 */
export async function getPostsPage(
  offset: number,
  limit: number,
): Promise<Post[]> {
  return getPostsPageCached(CONTENT_VERSION, offset, limit);
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
  // Returns null only when no slug matches; a render or config failure still
  // throws, so a genuine 404 stays distinct from a broken post.
  return coreGetPostOrNull(slug, {
    ...{{COLLECTION_ARG}},
    reachable: true,
  });
}

/** A single post rendered to HTML, or `null` when no slug matches. */
export async function getPost(slug: string): Promise<Post | null> {
  return getPostCached(CONTENT_VERSION, slug);
}
