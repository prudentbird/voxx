import type { Metadata } from "next";
import type { SeoData } from "@prudentbird/voxx-core";

export function toMetadata(seo: SeoData): Metadata {
  const metadata: Metadata = {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
  };

  if (seo.openGraph) {
    metadata.openGraph = {
      type: "article",
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      url: seo.openGraph.url,
      siteName: seo.openGraph.siteName,
      locale: seo.openGraph.locale,
      images: seo.openGraph.images,
      publishedTime: seo.openGraph.publishedTime,
      modifiedTime: seo.openGraph.modifiedTime,
      authors: seo.openGraph.authors,
      tags: seo.openGraph.tags,
    };
  }

  if (seo.twitter) {
    metadata.twitter = {
      card: "summary_large_image",
      title: seo.twitter.title,
      description: seo.twitter.description,
      images: seo.twitter.images,
      site: seo.twitter.site,
      creator: seo.twitter.creator,
    };
  }

  return metadata;
}
