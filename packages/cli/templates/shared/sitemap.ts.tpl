import type { MetadataRoute } from "next";
import { absoluteUrl } from "@voxx/core";
import { getConfig, getPosts } from "{{DATA_IMPORT}}";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, config] = await Promise.all([getPosts(), getConfig()]);

  const index = {
    url: absoluteUrl(config.site.url, config.content.basePath),
    lastModified: posts[0]?.updated ?? posts[0]?.date,
  };

  return [
    {
      url: config.site.url,
      lastModified: index.lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    { ...index, changeFrequency: "weekly", priority: 0.9 },
    ...posts
      .filter((post) => post.path.length > 0)
      .map((post) => ({
        url: absoluteUrl(config.site.url, post.url),
        lastModified: post.updated ?? post.date,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
  ];
}
