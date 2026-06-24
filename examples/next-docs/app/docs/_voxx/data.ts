import "server-only";
import { cacheLife } from "next/cache";
import {
  findPost,
  getPosts as coreGetPosts,
  loadConfig as coreLoadConfig,
  type Post,
  type VoxxConfig,
} from "@voxx/core";
import { CONTENT_VERSION } from "./content-version";

async function getPostsCached(version: number): Promise<Post[]> {
  "use cache";
  cacheLife("max");
  void version;
  return coreGetPosts({ collection: "docs" });
}

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

export async function getPost(slug: string): Promise<Post | null> {
  const posts = await getPosts();
  return findPost(posts, slug) ?? null;
}
