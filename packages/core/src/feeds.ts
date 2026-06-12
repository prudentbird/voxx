import { absoluteUrl, escapeXml, isoDate, joinPath, rfc822 } from "./util";
import type { Post, VoxxConfig } from "./types";

export interface RenderRssOptions {
  /** URL path the feed is served from. Defaults to "rss.xml" under the collection's basePath. */
  path?: string;
}

const cdata = (value: string) =>
  `<![CDATA[${value.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;

export function rssPath(config: VoxxConfig): string {
  return joinPath(config.content.basePath, "rss.xml");
}

export function renderRss(
  posts: Post[],
  config: VoxxConfig,
  opts: RenderRssOptions = {},
): string {
  const self = absoluteUrl(config.site.url, opts.path ?? rssPath(config));
  const items = posts
    .map((p) => {
      const link = absoluteUrl(config.site.url, p.url);
      const categories = p.tags
        .map((t) => `      <category>${escapeXml(t)}</category>`)
        .join("\n");
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

export interface RenderSitemapOptions {
  /** Index page paths to list before the posts. Defaults to the active collection's basePath. */
  indexPaths?: string[];
}

export function renderSitemap(
  posts: Post[],
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

export function renderRobotsTxt(config: VoxxConfig): string {
  const lines = ["User-agent: *", "Allow: /"];
  if (config.features.sitemap) {
    lines.push("", `Sitemap: ${absoluteUrl(config.site.url, "/sitemap.xml")}`);
  }
  return `${lines.join("\n")}\n`;
}
