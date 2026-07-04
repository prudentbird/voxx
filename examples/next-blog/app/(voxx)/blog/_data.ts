import "server-only";
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

/** Filters and pagination accepted by {@link listPosts}. */
export interface ListOptions {
  /** Keep only posts tagged with this value. */
  tag?: string;
  /** Skip this many posts from the start of the sorted, filtered set. */
  offset?: number;
  /** Cap the result to this many posts. */
  limit?: number;
}

// Content is immutable per deploy in production, so each distinct call is
// resolved once and its promise is reused for the life of the process. That is
// the same guarantee `"use cache"` plus a content version gave the Cache
// Components variant, without the whole-app rendering-mode requirement.
// Development bypasses the cache so markdown edits show up on the next request.
// The size cap bounds keys minted from request query params (offsets, tags),
// which would otherwise grow the map without limit; oldest entries evict first.
const MAX_CACHE_ENTRIES = 256;
const cache = new Map<string, Promise<unknown>>();

function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV === "development") return load();
  const hit = cache.get(key);
  if (hit) return hit as Promise<T>;
  // Drop the entry if the load rejects so a transient failure is not cached
  // for the life of the process.
  const promise = load().catch((error: unknown) => {
    cache.delete(key);
    throw error;
  });
  if (cache.size >= MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value as string);
  }
  cache.set(key, promise);
  return promise;
}

/**
 * Lists post metadata (no rendered HTML) with optional tag filtering and
 * pagination, plus the unpaginated total. Cheap enough to scale to large
 * content sets — use it for indexes, navigation, sitemaps, and feeds.
 */
export async function listPosts(
  opts: ListOptions = {},
): Promise<ListPostsResult> {
  return memo(`listPosts:${JSON.stringify(opts)}`, () =>
    coreListPosts({ ...{ collection: "blog" }, ...opts }),
  );
}

/** Metadata for every reachable post — used to enumerate static params. */
export async function listReachablePosts(): Promise<PostMeta[]> {
  return memo("listReachablePosts", async () => {
    const { posts } = await coreListPosts({
      ...{ collection: "blog" },
      reachable: true,
    });
    return posts;
  });
}

/**
 * Every post rendered to HTML. Reserved for consumers that genuinely need the
 * full corpus rendered (RSS, `llms-full.txt`).
 */
export async function getPosts(): Promise<Post[]> {
  return memo("getPosts", () => coreGetPosts({ collection: "blog" }));
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
  return memo(`getPostsPage:${JSON.stringify([offset, limit])}`, () =>
    coreGetPosts({ ...{ collection: "blog" }, offset, limit }),
  );
}

export async function getConfig(): Promise<VoxxConfig> {
  return memo("getConfig", () => coreLoadConfig());
}

/** A single post rendered to HTML, or `null` when no slug matches. */
export async function getPost(slug: string): Promise<Post | null> {
  return memo(`getPost:${JSON.stringify(slug)}`, () =>
    // Returns null only when no slug matches; a render or config failure still
    // throws, so a genuine 404 stays distinct from a broken post.
    coreGetPostOrNull(slug, {
      ...{ collection: "blog" },
      reachable: true,
    }),
  );
}
