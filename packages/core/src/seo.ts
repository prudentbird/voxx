import { absoluteUrl } from "./util";
import type { ContentType, Post, SeoData, VoxxConfig } from "./types";

const JSON_LD_TYPE: Record<ContentType, string> = {
  blog: "BlogPosting",
  docs: "TechArticle",
  changelog: "Article",
};

/**
 * Builds the full SEO payload for a post — canonical URL, Open Graph,
 * Twitter card, and JSON-LD — based on the active config flags.
 *
 * @param post - The rendered post to generate metadata for.
 * @param config - Resolved Voxx config.
 * @returns `SeoData` ready to be spread into `<head>` metadata.
 */
export function buildSeo(post: Post, config: VoxxConfig): SeoData {
  const canonical = absoluteUrl(config.site.url, post.url);
  const description = post.description ?? post.excerpt;
  const imgSrc = post.image ?? config.seo.defaultImage ?? undefined;
  const images = imgSrc ? [absoluteUrl(config.site.url, imgSrc)] : [];
  const authors = post.author
    ? [post.author]
    : config.site.author
      ? [config.site.author.name]
      : [];

  const tags = config.features.tags ? post.tags : [];

  const seo: SeoData = { title: post.title, description, canonical };

  if (config.seo.openGraph) {
    seo.openGraph = {
      title: post.title,
      description,
      url: canonical,
      type: "article",
      siteName: config.site.title,
      locale: config.site.locale,
      images,
      publishedTime: post.date,
      modifiedTime: post.updated,
      authors,
      tags,
    };
  }

  if (config.seo.openGraph || config.seo.twitter) {
    seo.twitter = {
      card: "summary_large_image",
      site: config.seo.twitter ?? undefined,
      creator: config.seo.twitter ?? undefined,
      title: post.title,
      description,
      images,
    };
  }

  if (config.seo.jsonLd) {
    seo.jsonLd = {
      "@context": "https://schema.org",
      "@type": JSON_LD_TYPE[config.content.type],
      headline: post.title,
      description,
      datePublished: post.date,
      dateModified: post.updated ?? post.date,
      ...(images.length ? { image: images } : {}),
      author: {
        "@type": "Person",
        name: authors[0] ?? config.site.title,
        ...(config.site.author?.url ? { url: config.site.author.url } : {}),
      },
      ...(tags.length ? { keywords: tags.join(", ") } : {}),
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      ...(config.site.title
        ? { publisher: { "@type": "Organization", name: config.site.title } }
        : {}),
    };
  }

  return seo;
}
