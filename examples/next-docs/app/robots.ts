import type { MetadataRoute } from "next";
import { absoluteUrl } from "@prudentbird/voxx-core";
import { getConfig } from "./docs/_voxx/data";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const config = await getConfig();
  return {
    rules: { userAgent: "*", allow: "/" },
    ...(config.features.sitemap
      ? { sitemap: absoluteUrl(config.site.url, "/sitemap.xml") }
      : {}),
  };
}
