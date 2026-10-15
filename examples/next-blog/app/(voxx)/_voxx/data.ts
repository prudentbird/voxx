import "server-only";

import {
  VOXX_ASSET_PREFIX,
  getPosts as coreGetPosts,
  listPosts as coreListPosts,
  loadConfig,
} from "@prudentbird/voxx-core";

async function getConfigCached(version: number) {

  void version;
  return loadConfig();
}

export async function getConfig() {
  return getConfigCached(0);
}

async function listCollectionsCached(version: number) {

  void version;
  const config = await loadConfig();
  return Promise.all(config.collections.map(async (collection) => ({
    collection,
    ...await coreListPosts({ config, collection: collection.name }),
  })));
}

export async function listCollections() {
  return listCollectionsCached(0);
}

async function getPostsCached(version: number) {

  void version;
  const config = await loadConfig();
  const posts = await Promise.all(config.collections.map((collection) =>
    coreGetPosts({ config, collection: collection.name, assetPrefix: VOXX_ASSET_PREFIX }),
  ));
  return posts.flat();
}

export async function getPosts() {
  return getPostsCached(0);
}
