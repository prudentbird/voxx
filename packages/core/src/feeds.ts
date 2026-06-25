import { absoluteUrl, escapeXml, isoDate, joinPath, rfc822 } from "./util";
import type { Post, PostMeta, VoxxConfig } from "./types";

/** Options for `renderRss`. */
export interface RenderRssOptions {
  /** Override the default RSS feed path (`<basePath>/rss.xml`). */
  path?: string;
}

const cdata = (value: string) =>
  `<![CDATA[${value.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;

/**
 * Returns the default RSS feed path for the active content collection.
 *
 * @param config - Resolved Voxx config.
 * @returns URL path string, e.g. `/blog/rss.xml`.
 */
export function rssPath(config: VoxxConfig): string {
  return joinPath(config.content.basePath, "rss.xml");
}

/**
 * Renders a valid RSS 2.0 feed with `content:encoded` for all posts.
 *
 * @param posts - Ordered list of posts (most recent first).
 * @param config - Resolved Voxx config.
 * @param opts - Optional feed path override.
 * @returns RSS XML string.
 */
export function renderRss(
  posts: Post[],
  config: VoxxConfig,
  opts: RenderRssOptions = {},
): string {
  const self = absoluteUrl(config.site.url, opts.path ?? rssPath(config));
  const items = posts
    .map((p) => {
      const link = absoluteUrl(config.site.url, p.url);
      const categories = config.features.tags
        ? p.tags
            .map((t) => `      <category>${escapeXml(t)}</category>`)
            .join("\n")
        : "";
      return [
        "    <item>",
        `      <title>${escapeXml(p.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${rfc822(p.date)}</pubDate>`,
        `      <description>${escapeXml(p.description ?? p.excerpt)}</description>`,
        `      <content:encoded>${cdata(p.html)}</content:encoded>`,
        categories,
        "    </item>",
      ]
        .filter((l) => l !== "")
        .join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(config.site.title)}</title>
    <link>${escapeXml(config.site.url)}</link>
    <description>${escapeXml(config.site.description)}</description>
    <language>${escapeXml(config.site.locale)}</language>
    <lastBuildDate>${rfc822(posts[0]?.date ?? new Date().toISOString())}</lastBuildDate>
    <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

/** Options for `renderSitemap`. */
export interface RenderSitemapOptions {
  /** Additional index paths to include before the post entries. */
  indexPaths?: string[];
}

/**
 * Renders an XML sitemap for all posts.
 *
 * @param posts - List of posts to include.
 * @param config - Resolved Voxx config.
 * @param opts - Optional extra index paths.
 * @returns Sitemap XML string.
 */
export function renderSitemap(
  posts: PostMeta[],
  config: VoxxConfig,
  opts: RenderSitemapOptions = {},
): string {
  const lastmod = isoDate(
    posts[0]?.updated ?? posts[0]?.date ?? new Date().toISOString(),
  );
  const entries = [
    ...(opts.indexPaths ?? [config.content.basePath]).map((p) => ({
      loc: absoluteUrl(config.site.url, p),
      lastmod,
    })),
    ...posts.map((p) => ({
      loc: absoluteUrl(config.site.url, p.url),
      lastmod: isoDate(p.updated ?? p.date),
    })),
  ];

  const body = entries
    .map((u) =>
      [
        "  <url>",
        `    <loc>${escapeXml(u.loc)}</loc>`,
        `    <lastmod>${u.lastmod}</lastmod>`,
        "  </url>",
      ].join("\n"),
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

/**
 * Renders a `robots.txt` that allows all crawlers and optionally
 * references the sitemap when `features.sitemap` is enabled.
 *
 * @param config - Resolved Voxx config.
 * @returns `robots.txt` content string.
 */
export function renderRobotsTxt(config: VoxxConfig): string {
  const lines = ["User-agent: *", "Allow: /"];
  if (config.features.sitemap) {
    lines.push("", `Sitemap: ${absoluteUrl(config.site.url, "/sitemap.xml")}`);
  }
  return `${lines.join("\n")}\n`;
}
