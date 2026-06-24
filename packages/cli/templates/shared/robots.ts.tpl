import type { MetadataRoute } from "next";
import { absoluteUrl } from "@voxx/core";
import { getConfig } from "{{DATA_IMPORT}}";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const config = await getConfig();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/_next/", "/api/"],
    },
    ...(config.features.sitemap
      ? { sitemap: absoluteUrl(config.site.url, "/sitemap.xml") }
      : {}),
  };
}
