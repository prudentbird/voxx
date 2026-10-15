import type { MetadataRoute } from "next";
import { absoluteUrl } from "@prudentbird/voxx-core";
import { getConfig, listCollections } from "{{DATA_IMPORT}}";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [collections, config] = await Promise.all([listCollections(), getConfig()]);
  const entries: MetadataRoute.Sitemap = collections.flatMap(({ collection, posts }) => [
    {
      url: absoluteUrl(config.site.url, collection.basePath),
      lastModified: posts[0]?.updated ?? posts[0]?.date,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...posts.filter((post) => post.path.length > 0).map((post) => ({
      url: absoluteUrl(config.site.url, post.url),
      lastModified: post.updated ?? post.date,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ]);

  return [
    {
      url: config.site.url,
      lastModified: entries[0]?.lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...entries,
  ];
}
