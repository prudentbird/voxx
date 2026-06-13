import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { parseArgs } from "node:util";
import {
  buildNavTree,
  buildSeo,
  escapeXml as esc,
  formatDate,
  getPosts,
  humanize,
  loadConfig,
  renderLlmsFull,
  renderLlmsTxtSections,
  renderRobotsTxt,
  renderRss,
  renderSitemap,
  rssPath,
  sectionHeading,
  serializeJsonLd,
  type CollectionConfig,
  type NavNode,
  type Post,
  type SeoData,
  type VoxxConfig,
} from "@prudentbird/voxx-core";
import { c, exists, log, resolveCoreAsset } from "../util";

function stripLead(path: string): string {
  return path.replace(/^\/+/, "");
}

function headTags(seo: SeoData, config: VoxxConfig): string {
  const tags: string[] = [
    `<meta name="description" content="${esc(seo.description)}">`,
    `<link rel="canonical" href="${esc(seo.canonical)}">`,
  ];
  const og = seo.openGraph;
  if (og) {
    tags.push(
      `<meta property="og:type" content="article">`,
      `<meta property="og:title" content="${esc(og.title)}">`,
      `<meta property="og:description" content="${esc(og.description)}">`,
      `<meta property="og:url" content="${esc(og.url)}">`,
      `<meta property="og:site_name" content="${esc(og.siteName)}">`,
      ...og.images.map(
        (src) => `<meta property="og:image" content="${esc(src)}">`,
      ),
    );
  }
  if (seo.twitter) {
    tags.push(
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${esc(seo.twitter.title)}">`,
      `<meta name="twitter:description" content="${esc(seo.twitter.description)}">`,
    );
  }
  if (config.seo.jsonLd && seo.jsonLd) {
    tags.push(
      `<script type="application/ld+json">${serializeJsonLd(seo.jsonLd)}</script>`,
    );
  }
  return tags.join("\n    ");
}

function shell(opts: {
  title: string;
  lang: string;
  head: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="${esc(opts.lang)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(opts.title)}</title>
    <link rel="stylesheet" href="/_voxx/voxx-globals.css">
    <link rel="stylesheet" href="/_voxx/voxx.css">
    ${opts.head}
  </head>
  <body>
${opts.body}
  </body>
</html>
`;
}

function siteHeader(config: VoxxConfig): string {
  const base = config.site.titleHref ?? "/";
  const rssIcon = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="5" cy="19" r="1" fill="currentColor"/></svg>`;
  const rss = config.features.rss
    ? `<div class="voxx-header__actions"><a class="voxx-icon-button" href="${esc(rssPath(config))}" aria-label="RSS feed">${rssIcon}</a></div>`
    : "";
  return `    <header class="voxx voxx-header">
      <a class="voxx-header__title" href="${esc(base)}">${esc(config.site.title)}</a>
      ${rss}
    </header>`;
}

function metaLine(post: Post, config: VoxxConfig): string {
  const rt = config.features.readingTime
    ? ` · ${post.readingTimeMinutes} min read`
    : "";
  return `<time datetime="${esc(post.date)}">${esc(formatDate(post.date, config.site.locale))}</time>${esc(rt)}`;
}

function tocAside(post: Post): string {
  if (post.toc.length === 0) return "";
  const items = post.toc
    .map(
      (t) =>
        `          <li class="voxx-toc__item" data-depth="${t.depth}"><a href="#${esc(t.id)}">${esc(t.text)}</a></li>`,
    )
    .join("\n");
  return `      <aside class="voxx-aside"><div class="voxx-aside__inner">
        <nav class="voxx-toc" aria-label="On this page">
          <p class="voxx-toc__title"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 4h7M2.5 8h11M2.5 12h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>On this page</p>
          <ul class="voxx-toc__list">
${items}
          </ul>
        </nav>
      </div></aside>`;
}

function indexBody(posts: Post[], config: VoxxConfig): string {
  const cards =
    posts.length === 0
      ? `<p class="voxx-empty">No posts yet.</p>`
      : `<ul class="voxx-postlist">
${posts
  .map((post) => {
    const tags =
      config.features.tags && post.tags.length
        ? `<ul class="voxx-tags">${post.tags.map((t) => `<li class="voxx-tag">${esc(t)}</li>`).join("")}</ul>`
        : "";
    const excerpt = post.excerpt
      ? `<p class="voxx-postcard__excerpt">${esc(post.excerpt)}</p>`
      : "";
    return `      <li class="voxx-postcard"><a class="voxx-postcard__link" href="${esc(post.url)}">
        <h2 class="voxx-postcard__title">${esc(post.title)}</h2>
        <p class="voxx-postcard__meta">${metaLine(post, config)}</p>
        ${excerpt}
        ${tags}
      </a></li>`;
  })
  .join("\n")}
    </ul>`;

  return `    <main class="voxx voxx-index">
      <header class="voxx-index__header">
        <h1>${esc(config.site.title)}</h1>
        ${config.site.description ? `<p class="voxx-index__desc">${esc(config.site.description)}</p>` : ""}
      </header>
      ${cards}
    </main>`;
}

function backLink(config: VoxxConfig): string {
  const href = config.content.basePath || "/";
  const arrow = `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 12 6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `<a class="voxx-article__back" href="${esc(href)}">${arrow}All posts</a>`;
}

function postBody(post: Post, config: VoxxConfig): string {
  const aside = config.features.toc ? tocAside(post) : "";
  return `    <main class="voxx voxx-layout">
      <article class="voxx-article">
        ${backLink(config)}
        <header class="voxx-article__header">
          <h1>${esc(post.title)}</h1>
          <p class="voxx-article__meta">${metaLine(post, config)}</p>
        </header>
        <div class="voxx-prose">${post.html}</div>
      </article>
${aside}
    </main>`;
}

function navHtml(items: NavNode[], activeUrl: string): string {
  if (items.length === 0) return "";
  const lis = items
    .map((item) => {
      const label = item.url
        ? `<a class="voxx-nav__link" href="${esc(item.url)}"${item.url === activeUrl ? ' data-active="true"' : ""}>${esc(item.title)}</a>`
        : `<span class="voxx-nav__section">${esc(item.title)}</span>`;
      return `<li>${label}${navHtml(item.children, activeUrl)}</li>`;
    })
    .join("\n");
  return `<ul class="voxx-nav__list">\n${lis}\n</ul>`;
}

function pagerHtml(prev: Post | undefined, next: Post | undefined): string {
  if (!prev && !next) return "";
  const link = (post: Post, label: string, cls: string) =>
    `<a class="voxx-pager__link${cls}" href="${esc(post.url)}"><span class="voxx-pager__label">${label}</span><span class="voxx-pager__title">${esc(post.title)}</span></a>`;
  return `        <nav class="voxx-pager">
          ${prev ? link(prev, "Previous", "") : "<span></span>"}
          ${next ? link(next, "Next", " voxx-pager__link--next") : "<span></span>"}
        </nav>`;
}

function docsSidebar(
  nav: NavNode[],
  activeUrl: string,
  config: VoxxConfig,
): string {
  const base = config.site.titleHref ?? "/";
  const menuIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>`;
  return `<aside class="voxx-docs__nav"><div class="voxx-docs__nav-inner">
        <div class="voxx-docs__nav-header">
          <details class="voxx-docs__menu"><summary aria-label="Navigation">${menuIcon}</summary>
            <div class="voxx-docs__menu-panel"><nav class="voxx-nav">${navHtml(nav, activeUrl)}</nav></div>
          </details>
          <a class="voxx-docs__title" href="${esc(base)}">${esc(config.site.title)}</a>
        </div>
        <nav class="voxx-nav">${navHtml(nav, activeUrl)}</nav>
      </div></aside>`;
}

function docBody(
  post: Post,
  posts: Post[],
  index: number,
  nav: NavNode[],
  config: VoxxConfig,
): string {
  const prev = index > 0 ? posts[index - 1] : undefined;
  const next = posts[index + 1];
  const aside = config.features.toc ? tocAside(post) : "";
  const desc = post.description
    ? `<p class="voxx-article__meta">${esc(post.description)}</p>`
    : "";

  return `    <div class="voxx voxx-docs">
      ${docsSidebar(nav, post.url, config)}
      <main class="voxx-layout">
        <article class="voxx-article">
          <header class="voxx-article__header">
            <h1>${esc(post.title)}</h1>
            ${desc}
          </header>
          <div class="voxx-prose">${post.html}</div>
${pagerHtml(prev, next)}
        </article>
${aside}
      </main>
    </div>`;
}

function docsIndexBody(nav: NavNode[], config: VoxxConfig): string {
  return `    <div class="voxx voxx-docs">
      ${docsSidebar(nav, "", config)}
      <main class="voxx-layout">
        <article class="voxx-article">
          <header class="voxx-article__header">
            <h1>${esc(config.site.title)}</h1>
            ${config.site.description ? `<p class="voxx-article__meta">${esc(config.site.description)}</p>` : ""}
          </header>
          <div class="voxx-prose">${navHtml(nav, "")}</div>
        </article>
      </main>
    </div>`;
}

function changelogBody(posts: Post[], config: VoxxConfig): string {
  const releases =
    posts.length === 0
      ? `<p class="voxx-empty">No releases yet.</p>`
      : `<div class="voxx-releases">
${posts
  .map(
    (post) => `      <section class="voxx-release" id="${esc(post.slug)}">
        <header class="voxx-release__header">
          <h2 class="voxx-release__version"><a href="#${esc(post.slug)}">${esc(post.version ? `v${post.version}` : post.title)}</a></h2>
          <time datetime="${esc(post.date)}">${esc(formatDate(post.date, config.site.locale))}</time>
        </header>
        <div class="voxx-prose">${post.html}</div>
      </section>`,
  )
  .join("\n")}
    </div>`;

  return `    <main class="voxx voxx-index">
      <header class="voxx-index__header">
        <h1>${esc(config.site.title)}</h1>
        ${config.site.description ? `<p class="voxx-index__desc">${esc(config.site.description)}</p>` : ""}
      </header>
      ${releases}
    </main>`;
}

/**
 * Rewrite root-absolute internal links (`href`/`src` beginning with a single
 * `/`) to paths relative to the page's own location. This keeps navigation and
 * asset links working whether the generated site is served from the domain
 * root, a subpath, or opened directly from the filesystem. Protocol-relative
 * (`//host`) and external URLs are left untouched.
 */
function relativizeLinks(
  html: string,
  fromDir: string,
  outDir: string,
): string {
  const prefix = relative(fromDir, outDir).split(sep).join("/") || ".";
  return html.replace(/\b(href|src)="\/(?!\/)([^"]*)"/g, `$1="${prefix}/$2"`);
}

async function writePage(
  path: string,
  html: string,
  outDir: string,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const out = path.endsWith(".html")
    ? relativizeLinks(html, dirname(path), outDir)
    : html;
  await writeFile(path, out);
}

const SOURCE_RE = /\.mdx?$/;

async function copyContentAssets(
  contentDir: string,
  targetDir: string,
): Promise<number> {
  let copied = 0;
  let entries: Dirent[];
  try {
    entries = await readdir(contentDir, {
      recursive: true,
      withFileTypes: true,
    });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (SOURCE_RE.test(name) || name.startsWith(".")) continue;
    const rel = relative(contentDir, join(entry.parentPath, name));
    const source = join(contentDir, rel);
    const target = join(targetDir, rel);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    copied++;
  }
  return copied;
}

async function buildCollection(
  config: VoxxConfig,
  posts: Post[],
  outDir: string,
): Promise<void> {
  const type = config.content.type;
  const indexPath = join(
    outDir,
    stripLead(config.content.basePath),
    "index.html",
  );

  if (type === "changelog") {
    await writePage(
      indexPath,
      shell({
        title: config.site.title,
        lang: config.site.locale,
        head: `<meta name="description" content="${esc(config.site.description)}">`,
        body: `${siteHeader(config)}\n${changelogBody(posts, config)}`,
      }),
      outDir,
    );
  } else if (type === "docs") {
    const nav = buildNavTree(posts);
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]!;
      const seo = buildSeo(post, config);
      await writePage(
        join(outDir, stripLead(post.url), "index.html"),
        shell({
          title: `${post.title} — ${config.site.title}`,
          lang: config.site.locale,
          head: headTags(seo, config),
          body: docBody(post, posts, i, nav, config),
        }),
        outDir,
      );
    }
    if (!posts.some((p) => p.path.length === 0)) {
      await writePage(
        indexPath,
        shell({
          title: config.site.title,
          lang: config.site.locale,
          head: `<meta name="description" content="${esc(config.site.description)}">`,
          body: docsIndexBody(nav, config),
        }),
        outDir,
      );
    }
  } else {
    await writePage(
      indexPath,
      shell({
        title: config.site.title,
        lang: config.site.locale,
        head: `<meta name="description" content="${esc(config.site.description)}">`,
        body: `${siteHeader(config)}\n${indexBody(posts, config)}`,
      }),
      outDir,
    );

    for (const post of posts) {
      const seo = buildSeo(post, config);
      await writePage(
        join(outDir, stripLead(post.url), "index.html"),
        shell({
          title: `${post.title} — ${config.site.title}`,
          lang: config.site.locale,
          head: headTags(seo, config),
          body: `${siteHeader(config)}\n${postBody(post, config)}`,
        }),
        outDir,
      );
    }
  }
}

export interface BuildSiteOptions {
  cwd: string;
  outDir: string;
  includeDrafts?: boolean | undefined;
  quiet?: boolean;
}

export interface BuildSiteResult {
  config: VoxxConfig;
  pageCount: number;
  collectionCount: number;
  indexRel: string;
}

export async function buildSite(
  opts: BuildSiteOptions,
): Promise<BuildSiteResult> {
  const { cwd, outDir } = opts;
  const config = await loadConfig({ cwd });
  const collections = config.collections;
  const multi = collections.length > 1;

  await mkdir(join(outDir, "_voxx"), { recursive: true });
  await copyFile(
    resolveCoreAsset("theme/voxx.css"),
    join(outDir, "_voxx", "voxx.css"),
  );
  await copyFile(
    resolveCoreAsset("theme/demo-globals.css"),
    join(outDir, "_voxx", "voxx-globals.css"),
  );

  const allPosts: Post[] = [];
  const sections: Array<{ heading: string; posts: Post[] }> = [];
  let pageCount = 0;

  for (const collection of collections) {
    const view: VoxxConfig = { ...config, content: { ...collection } };
    const posts = await getPosts({
      config: view,
      includeDrafts: opts.includeDrafts,
    });
    await buildCollection(view, posts, outDir);
    const assetTarget = join(outDir, stripLead(collection.basePath));
    await copyContentAssets(collection.dir, assetTarget);

    if (config.features.rss && isFeedType(collection)) {
      await writePage(
        join(outDir, stripLead(rssPath(view))),
        renderRss(posts, view),
        outDir,
      );
    }

    sections.push({
      heading: multi
        ? humanize(collection.name)
        : sectionHeading(collection.type),
      posts,
    });
    allPosts.push(...posts);
    pageCount += posts.length;
  }

  if (config.features.sitemap) {
    await writeFile(
      join(outDir, "sitemap.xml"),
      renderSitemap(allPosts, config, {
        indexPaths: collections.map((col) => col.basePath),
      }),
    );
    await writeFile(join(outDir, "robots.txt"), renderRobotsTxt(config));
  }
  if (config.features.llmsTxt) {
    await writeFile(
      join(outDir, "llms.txt"),
      renderLlmsTxtSections(sections, config),
    );
    await writeFile(
      join(outDir, "llms-full.txt"),
      renderLlmsFull(allPosts, config),
    );
  }

  return {
    config,
    pageCount,
    collectionCount: collections.length,
    indexRel: join(
      relative(cwd, outDir),
      stripLead(collections[0]!.basePath),
      "index.html",
    ),
  };
}

function isFeedType(collection: CollectionConfig): boolean {
  return collection.type === "blog" || collection.type === "changelog";
}

export async function build(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      out: { type: "string" },
      drafts: { type: "boolean" },
    },
    allowPositionals: true,
  });

  const cwd = process.cwd();
  if (!(await exists(join(cwd, "voxx.json")))) {
    log.error("No voxx.json found. Run `voxx init` first.");
    process.exitCode = 1;
    return;
  }

  const outDir = join(cwd, values.out ?? "dist");
  const result = await buildSite({
    cwd,
    outDir,
    includeDrafts: values.drafts ? true : undefined,
  });

  const { config } = result;
  if (!config.site.url || /example\.com/.test(config.site.url)) {
    log.warn(
      `site.url is ${config.site.url ? `"${config.site.url}"` : "empty"} — feeds, sitemap, and SEO tags need the real production URL in voxx.json.`,
    );
  }

  const servesRoot = config.collections.some(
    (col) => stripLead(col.basePath) === "",
  );
  if (config.site.titleHref === undefined && !servesRoot) {
    log.warn(
      `The title link defaults to "/", but nothing is generated there (no collection uses basePath "/"). Set site.titleHref in voxx.json — e.g. "${config.collections[0]!.basePath}" to point at the index, or your parent site's home if this is embedded under a larger site.`,
    );
  }

  const type = config.content.type;
  const noun =
    type === "changelog" ? "release" : type === "docs" ? "page" : "post";
  const what =
    result.collectionCount > 1
      ? `${result.pageCount} pages across ${result.collectionCount} collections`
      : `${result.pageCount} ${noun}${result.pageCount === 1 ? "" : "s"}`;
  log.success(`Built ${what} → ${relative(cwd, outDir)}/`);
  log.info(
    `  Open ${c.cyan(result.indexRel)} in a browser, or run ${c.cyan("voxx dev")} to preview with a local server.`,
  );
}
