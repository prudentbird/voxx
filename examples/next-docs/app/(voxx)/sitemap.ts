import type { MetadataRoute } from "next";
import { absoluteUrl } from "@prudentbird/voxx-core";
import { getConfig, listCollections } from "./_voxx/data";

function newestDate(dates: string[]): string | undefined {
  return dates.reduce<string | undefined>((latest, date) =>
    latest === undefined || Date.parse(date) > Date.parse(latest) ? date : latest,
  undefined);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [collections, config] = await Promise.all([listCollections(), getConfig()]);
  const entries: MetadataRoute.Sitemap = collections.flatMap(({ collection, posts }) => [
    {
      url: absoluteUrl(config.site.url, collection.basePath),
      lastModified: newestDate(posts.map((post) => post.updated ?? post.date)),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...posts
      .filter((post) => post.path.length > 0 && !post.url.includes("#"))
      .map((post) => ({
        url: absoluteUrl(config.site.url, post.url),
        lastModified: post.updated ?? post.date,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
  ]);

  return [
    {
      url: config.site.url,
      lastModified: newestDate(collections.flatMap(({ posts }) => posts.map((post) => post.updated ?? post.date))),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...entries,
  ];
}
