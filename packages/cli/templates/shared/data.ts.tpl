import "server-only";
import {
  findPost,
  getPosts as coreGetPosts,
  loadConfig as coreLoadConfig,
  type Post,
  type VoxxConfig,
} from "@voxx/core";

export async function getPosts(): Promise<Post[]> {
  "use cache";
  return coreGetPosts({{COLLECTION_ARG}});
}

export async function getConfig(): Promise<VoxxConfig> {
  "use cache";
  return coreLoadConfig();
}

// Derived from the cached list so a build renders every post exactly once,
// and drafts stay as invisible by direct URL as they are in lists.
export async function getPost(slug: string): Promise<Post | null> {
  const posts = await getPosts();
  return findPost(posts, slug) ?? null;
}
