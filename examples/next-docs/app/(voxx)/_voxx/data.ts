import "server-only";
import { cacheLife } from "next/cache";
import { CONTENT_VERSION } from "./content-version";
import {
  VOXX_ASSET_PREFIX,
  getPosts as coreGetPosts,
  listPosts as coreListPosts,
  loadConfig,
} from "@prudentbird/voxx-core";

async function getConfigCached(version: number) {
  "use cache";
  cacheLife("max");
  void version;
  return loadConfig();
}

export async function getConfig() {
  return getConfigCached(CONTENT_VERSION);
}

async function listCollectionsCached(version: number) {
  "use cache";
  cacheLife("max");
  void version;
  const config = await loadConfig();
  return Promise.all(config.collections.map(async (collection) => ({
    collection,
    ...await coreListPosts({ config, collection: collection.name }),
  })));
}

export async function listCollections() {
  return listCollectionsCached(CONTENT_VERSION);
}

async function getPostsCached(version: number) {
  "use cache";
  cacheLife("max");
  void version;
  const config = await loadConfig();
  const posts = await Promise.all(config.collections.map((collection) =>
    coreGetPosts({ config, collection: collection.name, assetPrefix: VOXX_ASSET_PREFIX }),
  ));
  return posts.flat();
}

export async function getPosts() {
  return getPostsCached(CONTENT_VERSION);
}
