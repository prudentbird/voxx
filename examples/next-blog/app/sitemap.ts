import type { MetadataRoute } from "next";
import { absoluteUrl } from "@prudentbird/voxx-core";
import { getConfig, getPosts } from "./blog/_voxx/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, config] = await Promise.all([getPosts(), getConfig()]);

  const index = {
    url: absoluteUrl(config.site.url, config.content.basePath),
    lastModified: posts[0]?.updated ?? posts[0]?.date,
  };

  return [
    { url: config.site.url, lastModified: index.lastModified },
    index,
    ...posts
      .filter((post) => post.path.length > 0)
      .map((post) => ({
        url: absoluteUrl(config.site.url, post.url),
        lastModified: post.updated ?? post.date,
      })),
  ];
}
