import { beforeAll, describe, expect, it } from "vitest";
import { Effect, Exit } from "effect";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEFAULT_CONFIG,
  absoluteUrl,
  buildNavTree,
  buildSeo,
  deriveExcerpt,
  findPost,
  getPost,
  getPosts,
  joinPath,
  readingTimeMinutes,
  renderLlmsTxt,
  renderLlmsTxtSections,
  renderLlmsFull,
  renderMarkdown,
  serializeJsonLd,
  renderRobotsTxt,
  renderRss,
  renderSitemap,
  slugify,
  splitOrderPrefix,
  formatDate,
  parseVersion,
  type Post,
  type VoxxConfig,
} from "../src/index";
import { parseFrontmatter } from "../src/frontmatter";

const config: VoxxConfig = {
  ...DEFAULT_CONFIG,
  theme: { ...DEFAULT_CONFIG.theme, codeTheme: "github-light" },
  site: {
    ...DEFAULT_CONFIG.site,
    title: "Test Blog",
    description: "A test",
    url: "https://example.com",
  },
};

async function makeContentDir() {
  const dir = await mkdtemp(join(tmpdir(), "voxx-"));
  await writeFile(
    join(dir, "first.md"),
    "---\ntitle: First Post\ndate: 2026-01-01\ntags: [css, ui]\n---\n\n## Heading One\n\nHello world, this is the body.\n",
  );
  await writeFile(
    join(dir, "second.md"),
    "---\ntitle: Second Post\ndate: 2026-02-01\n---\n\nSecond body text.\n",
  );
  await writeFile(
    join(dir, "draft.md"),
    "---\ntitle: Draft Post\ndate: 2026-03-01\ndraft: true\n---\n\nDraft body.\n",
  );
  return {
    ...config,
    content: { ...config.content, dir },
  } satisfies VoxxConfig;
}

describe("util", () => {
  it("slugifies", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
    expect(slugify("  Café déjà vu  ")).toBe("cafe-deja-vu");
  });
  it("joins paths and resolves urls", () => {
    expect(joinPath("/blog", "hi")).toBe("/blog/hi");
    expect(joinPath("blog/", "/hi")).toBe("/blog/hi");
    expect(absoluteUrl("https://x.com/", "/blog/hi")).toBe(
      "https://x.com/blog/hi",
    );
    expect(absoluteUrl("https://x.com", "https://cdn/y.png")).toBe(
      "https://cdn/y.png",
    );
  });
  it("derives an excerpt and reading time", () => {
    expect(deriveExcerpt("# Title\n\nSome **bold** text here.")).toBe(
      "Some bold text here.",
    );
    expect(readingTimeMinutes("word ".repeat(400))).toBe(2);
  });
});

describe("frontmatter", () => {
  it("treats empty YAML values (null) as absent", async () => {
    const parsed = await Effect.runPromise(
      parseFrontmatter(
        "blank.md",
        "---\ntitle: Hi\ndescription:\ntags:\ndate:\n---\nbody",
      ),
    );
    expect(parsed.data.description).toBeUndefined();
    expect(parsed.data.tags).toEqual([]);
    expect(parsed.data.date).toBeUndefined();
  });

  it("decodes valid frontmatter with defaults", async () => {
    const parsed = await Effect.runPromise(
      parseFrontmatter("ok.md", "---\ntitle: Hi\ndate: 2026-01-02\n---\nbody"),
    );
    expect(parsed.data.title).toBe("Hi");
    expect(parsed.data.date).toMatch(/^2026-01-02/);
    expect(parsed.data.draft).toBe(false);
    expect(parsed.data.tags).toEqual([]);
  });

  it("fails with a tagged error when title is missing", async () => {
    const exit = await Effect.runPromiseExit(
      parseFrontmatter("bad.md", "---\ndate: 2026-01-02\n---\nbody"),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const err = exit.cause;
      expect(JSON.stringify(err)).toContain("InvalidFrontmatter");
    }
  });
});

beforeAll(async () => {
  await renderMarkdown("```ts\nconst warm = true\n```\n", config);
});

describe("render", () => {
  it("adds heading ids and extracts a TOC", async () => {
    const { html, toc } = await renderMarkdown(
      "# Title\n\n## Section One\n\ntext\n\n### Nested\n\n## Section Two\n",
      config,
    );
    expect(html).toContain('id="section-one"');
    expect(toc.map((t) => t.text)).toEqual([
      "Section One",
      "Nested",
      "Section Two",
    ]);
    expect(toc[0]!.depth).toBe(2);
    expect(toc[1]!.depth).toBe(3);
  });

  it("highlights code blocks via shiki", async () => {
    const { html } = await renderMarkdown("```js\nconst a = 1\n```\n", config);
    expect(html).toContain("shiki");
  });

  it("renders an unknown language fence without throwing", async () => {
    const { html } = await renderMarkdown(
      "```nonsense\nweird stuff\n```\n",
      config,
    );
    expect(html).toContain("weird stuff");
  });

  it("highlights an on-demand language not in the base set", async () => {
    const { html } = await renderMarkdown("```ruby\nputs 1\n```\n", config);
    expect(html).toContain("shiki");
  });

  it("keeps raw HTML, inline and block", async () => {
    const { html } = await renderMarkdown(
      "Hello <span>inline</span>\n\n<div>block <strong>html</strong></div>\n\n<details><summary>More</summary>hidden</details>\n",
      config,
    );
    expect(html).toContain("<span>inline</span>");
    expect(html).toContain("<div>block <strong>html</strong></div>");
    expect(html).toContain("<details><summary>More</summary>hidden</details>");
  });
});

describe("content", () => {
  it("lists posts newest-first and hides drafts", async () => {
    const cfg = await makeContentDir();
    const posts = await getPosts({ config: cfg });
    expect(posts.map((p) => p.slug)).toEqual(["second", "first"]);
    expect(posts[1]!.tags).toEqual(["css", "ui"]);
    expect(posts[1]!.toc.map((t) => t.text)).toEqual(["Heading One"]);
    expect(posts[0]!.url).toBe("/blog/second");
    expect(posts[0]!.readingTimeMinutes).toBeGreaterThanOrEqual(1);
  });

  it("includes drafts when asked", async () => {
    const cfg = await makeContentDir();
    const posts = await getPosts({ config: cfg, includeDrafts: true });
    expect(posts.map((p) => p.slug)).toEqual(["draft", "second", "first"]);
  });

  it("hides drafts from getPost unless asked", async () => {
    const cfg = await makeContentDir();
    await expect(getPost("draft", { config: cfg })).rejects.toThrow();
    const draft = await getPost("draft", { config: cfg, includeDrafts: true });
    expect(draft.title).toBe("Draft Post");
  });

  it("ignores .mdx files (no MDX compiler in the pipeline)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "voxx-mdx-"));
    await writeFile(
      join(dir, "jsx.mdx"),
      "---\ntitle: JSX\ndate: 2026-01-01\n---\n\n<Counter />\n",
    );
    const cfg: VoxxConfig = { ...config, content: { ...config.content, dir } };
    const posts = await getPosts({ config: cfg });
    expect(posts).toEqual([]);
  });

  it("resolves relative asset references against the source directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "voxx-assets-"));
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(dir, "01-guides"), { recursive: true });
    await writeFile(
      join(dir, "01-guides", "pictures.md"),
      "---\ntitle: Pics\ndate: 2026-01-01\n---\n\n![diagram](./diagram.png)\n\n![up](../shared/logo.svg)\n",
    );
    const cfg: VoxxConfig = { ...config, content: { ...config.content, dir } };
    const posts = await getPosts({ config: cfg });
    expect(posts[0]!.html).toContain('src="/blog/01-guides/diagram.png"');
    expect(posts[0]!.html).toContain('src="/blog/shared/logo.svg"');
  });

  it("derives slug and date from a YYYY-MM-DD- filename prefix", async () => {
    const dir = await mkdtemp(join(tmpdir(), "voxx-"));
    await writeFile(
      join(dir, "2026-04-01-my-prefixed-post.md"),
      "---\ntitle: Prefixed\n---\n\nBody without a frontmatter date.\n",
    );
    const cfg: VoxxConfig = { ...config, content: { ...config.content, dir } };
    const posts = await getPosts({ config: cfg });
    expect(posts[0]!.slug).toBe("my-prefixed-post");
    expect(posts[0]!.date.slice(0, 10)).toBe("2026-04-01");
  });
});

describe("docs collections", () => {
  async function makeDocsDir() {
    const dir = await mkdtemp(join(tmpdir(), "voxx-docs-"));
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(dir, "01-getting-started"), { recursive: true });
    await mkdir(join(dir, "02-guides"), { recursive: true });
    await writeFile(
      join(dir, "index.md"),
      "---\ntitle: Welcome\n---\n\nIntro.\n",
    );
    await writeFile(
      join(dir, "01-getting-started", "index.md"),
      "---\ntitle: Getting Started\n---\n\nStart here.\n",
    );
    await writeFile(
      join(dir, "01-getting-started", "02-usage.md"),
      "---\ntitle: Usage\n---\n\nUse it.\n",
    );
    await writeFile(
      join(dir, "01-getting-started", "01-install.md"),
      "---\ntitle: Install\n---\n\nInstall it.\n",
    );
    await writeFile(
      join(dir, "02-guides", "deploy.md"),
      "---\ntitle: Deploy\n---\n\nShip it.\n",
    );
    return {
      ...config,
      content: { ...config.content, type: "docs", dir, basePath: "/docs" },
    } satisfies VoxxConfig;
  }

  it("splits order prefixes", () => {
    expect(splitOrderPrefix("01-install")).toEqual({
      order: 1,
      rest: "install",
    });
    expect(splitOrderPrefix("no-prefix")).toEqual({ rest: "no-prefix" });
  });

  it("orders depth-first and builds nested urls without order prefixes", async () => {
    const cfg = await makeDocsDir();
    const posts = await getPosts({ config: cfg });
    expect(posts.map((p) => p.url)).toEqual([
      "/docs",
      "/docs/getting-started",
      "/docs/getting-started/install",
      "/docs/getting-started/usage",
      "/docs/guides/deploy",
    ]);
    expect(posts[2]!.path).toEqual(["getting-started", "install"]);
  });

  it("resolves nested docs by path", async () => {
    const cfg = await makeDocsDir();
    const post = await getPost("getting-started/install", { config: cfg });
    expect(post.title).toBe("Install");
  });

  it("builds a nav tree with label-only sections", async () => {
    const cfg = await makeDocsDir();
    const nav = buildNavTree(await getPosts({ config: cfg }));
    expect(nav.map((n) => n.title)).toEqual([
      "Welcome",
      "Getting Started",
      "Guides",
    ]);
    expect(nav[1]!.url).toBe("/docs/getting-started");
    expect(nav[1]!.children.map((n) => n.title)).toEqual(["Install", "Usage"]);
    expect(nav[2]!.url).toBeUndefined();
    expect(nav[2]!.children.map((n) => n.title)).toEqual(["Deploy"]);
  });

  it("defaults docs features sensibly but keeps blog defaults intact", async () => {
    const { resolveConfig } = await import("../src/config");
    const { NodeContext } = await import("@effect/platform-node");
    const resolve = (data: unknown) =>
      Effect.runPromise(
        Effect.provide(resolveConfig(data, "/tmp"), NodeContext.layer),
      );
    const docs = await resolve({
      site: { title: "D", url: "https://d.dev" },
      content: { type: "docs" },
    });
    expect(docs.features.rss).toBe(false);
    expect(docs.features.readingTime).toBe(false);
    expect(docs.features.toc).toBe(true);
    const blog = await resolve({ site: { title: "B", url: "https://b.dev" } });
    expect(blog.features.rss).toBe(true);
  });
});

describe("changelog collections", () => {
  async function makeChangelogDir() {
    const dir = await mkdtemp(join(tmpdir(), "voxx-changelog-"));
    await writeFile(
      join(dir, "1.0.0.md"),
      "---\ntitle: v1.0.0\ndate: 2026-01-01\n---\n\nFirst stable release.\n",
    );
    await writeFile(
      join(dir, "1.1.0.md"),
      "---\ntitle: v1.1.0\ndate: 2026-02-01\n---\n\nAdded things.\n",
    );
    await writeFile(
      join(dir, "next-up.md"),
      '---\ntitle: Beta\nversion: "2.0.0-beta.1"\ndate: 2026-03-01\n---\n\nPreview.\n',
    );
    return {
      ...config,
      content: {
        ...config.content,
        type: "changelog",
        dir,
        basePath: "/changelog",
      },
    } satisfies VoxxConfig;
  }

  it("parses versions from filenames and frontmatter", () => {
    expect(parseVersion("1.4.0")).toBe("1.4.0");
    expect(parseVersion("v2.0.0-beta.1")).toBe("2.0.0-beta.1");
    expect(parseVersion("not-a-version")).toBeUndefined();
  });

  it("builds anchor urls on the timeline page, newest first", async () => {
    const cfg = await makeChangelogDir();
    const posts = await getPosts({ config: cfg });
    expect(posts.map((p) => [p.version, p.url])).toEqual([
      ["2.0.0-beta.1", "/changelog#next-up"],
      ["1.1.0", "/changelog#1-1-0"],
      ["1.0.0", "/changelog#1-0-0"],
    ]);
  });

  it("formats dates for display", () => {
    expect(formatDate("2026-01-01T00:00:00.000Z")).toBe("January 1, 2026");
    expect(formatDate("garbage")).toBe("garbage");
  });
});

describe("multi-collection config", () => {
  it("resolves collections with per-type defaults and backs content with the first", async () => {
    const { resolveConfig } = await import("../src/config");
    const { NodeContext } = await import("@effect/platform-node");
    const cfg = await Effect.runPromise(
      Effect.provide(
        resolveConfig(
          {
            site: { title: "Multi", url: "https://m.dev" },
            collections: [
              { name: "blog", dir: "content/posts" },
              { type: "docs" },
              { name: "releases", type: "changelog", basePath: "/changelog" },
            ],
          },
          "/srv/site",
        ),
        NodeContext.layer,
      ),
    );
    expect(cfg.collections.map((c) => [c.name, c.type, c.basePath])).toEqual([
      ["blog", "blog", "/blog"],
      ["docs", "docs", "/docs"],
      ["releases", "changelog", "/changelog"],
    ]);
    expect(cfg.collections[1]!.dir).toBe("/srv/site/content/docs");
    expect(cfg.content.dir).toBe("/srv/site/content/posts");
    expect(cfg.features.rss).toBe(true);
  });

  it("resolveCollectionDefaults owns the naming contract", async () => {
    const { resolveCollectionDefaults } = await import("../src/config");
    expect(resolveCollectionDefaults({})).toEqual({
      name: "blog",
      type: "blog",
      dir: "content/blog",
      basePath: "/blog",
      drafts: false,
    });
    expect(resolveCollectionDefaults({ type: "docs" })).toEqual({
      name: "docs",
      type: "docs",
      dir: "content/docs",
      basePath: "/docs",
      drafts: false,
    });
    expect(resolveCollectionDefaults({ name: "guides", type: "docs" })).toEqual(
      {
        name: "guides",
        type: "docs",
        dir: "content/guides",
        basePath: "/guides",
        drafts: false,
      },
    );
  });

  it("reads a named collection and rejects unknown names", async () => {
    const blogDir = await mkdtemp(join(tmpdir(), "voxx-multi-blog-"));
    const docsDir = await mkdtemp(join(tmpdir(), "voxx-multi-docs-"));
    await writeFile(
      join(blogDir, "post.md"),
      "---\ntitle: P\ndate: 2026-01-01\n---\nhi\n",
    );
    await writeFile(join(docsDir, "guide.md"), "---\ntitle: G\n---\nhi\n");
    const cfg: VoxxConfig = {
      ...config,
      content: { type: "blog", dir: blogDir, basePath: "/blog", drafts: false },
      collections: [
        {
          name: "blog",
          type: "blog",
          dir: blogDir,
          basePath: "/blog",
          drafts: false,
        },
        {
          name: "docs",
          type: "docs",
          dir: docsDir,
          basePath: "/docs",
          drafts: false,
        },
      ],
    };
    const docs = await getPosts({ config: cfg, collection: "docs" });
    expect(docs.map((p) => p.url)).toEqual(["/docs/guide"]);
    const blog = await getPosts({ config: cfg });
    expect(blog.map((p) => p.url)).toEqual(["/blog/post"]);
    await expect(getPosts({ config: cfg, collection: "nope" })).rejects.toThrow(
      /Unknown collection/,
    );
  });
});

const samplePost: Post = {
  slug: "hello",
  path: ["hello"],
  url: "/blog/hello",
  title: "Hello & Welcome",
  description: "An intro post",
  date: "2026-01-01T00:00:00.000Z",
  tags: ["intro", "css"],
  draft: false,
  authors: [],
  excerpt: "An intro post",
  readingTimeMinutes: 1,
  html: "<p>hi</p>",
  toc: [],
  content: "hi there",
};

describe("seo", () => {
  it("builds canonical, open graph, and json-ld", () => {
    const seo = buildSeo(samplePost, config);
    expect(seo.canonical).toBe("https://example.com/blog/hello");
    expect(seo.openGraph?.type).toBe("article");
    expect(seo.openGraph?.publishedTime).toBe("2026-01-01T00:00:00.000Z");
    expect(seo.jsonLd?.["@type"]).toBe("BlogPosting");
    expect(seo.jsonLd?.["headline"]).toBe("Hello & Welcome");
  });

  it("emits tags in og and json-ld by default but suppresses them when features.tags is false", () => {
    const on = buildSeo(samplePost, config);
    expect(on.openGraph?.tags).toEqual(["intro", "css"]);
    expect(on.jsonLd?.["keywords"]).toBe("intro, css");

    const offConfig: VoxxConfig = {
      ...config,
      features: { ...config.features, tags: false },
    };
    const off = buildSeo(samplePost, offConfig);
    expect(off.openGraph?.tags).toEqual([]);
    expect(off.jsonLd && "keywords" in off.jsonLd).toBe(false);
  });

  it("sources authors from the post, preferring per-author urls", () => {
    const multi: Post = {
      ...samplePost,
      authors: [{ name: "Jane Doe", url: "https://jane.example" }, { name: "Sam" }],
    };
    const seo = buildSeo(multi, config);
    expect(seo.openGraph?.authors).toEqual(["Jane Doe", "Sam"]);
    expect(seo.jsonLd?.["author"]).toEqual([
      { "@type": "Person", name: "Jane Doe", url: "https://jane.example" },
      { "@type": "Person", name: "Sam" },
    ]);
  });

  it("uses a single Person object when there is one author", () => {
    const one = buildSeo({ ...samplePost, authors: [{ name: "Solo" }] }, config);
    expect(one.jsonLd?.["author"]).toEqual({ "@type": "Person", name: "Solo" });
  });
});

describe("serializeJsonLd", () => {
  it("leaves plain data unchanged and round-trips", () => {
    expect(serializeJsonLd({ a: 1 })).toBe('{"a":1}');
    const obj = { headline: "Hello & Welcome", n: 2 };
    expect(JSON.parse(serializeJsonLd(obj))).toEqual(obj);
  });

  it("escapes script-breakout characters but parses back to the original", () => {
    const value = { headline: "x</script><img src=y onerror=alert(1)>" };
    const out = serializeJsonLd(value);
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c");
    expect(JSON.parse(out)).toEqual(value);
  });

  it("escapes ampersands and round-trips", () => {
    const value = { headline: "Tom & Jerry" };
    const out = serializeJsonLd(value);
    expect(out).toContain("\\u0026");
    expect(out).not.toContain("&");
    expect(JSON.parse(out)).toEqual(value);
  });
});

describe("feeds + llms", () => {
  it("produces well-formed-ish rss", () => {
    const rss = renderRss([samplePost], config);
    expect(rss.startsWith("<?xml")).toBe(true);
    expect(rss).toContain("<item>");
    expect(rss).toContain("<title>Hello &amp; Welcome</title>");
    expect(rss).toContain("https://example.com/blog/hello");
    expect((rss.match(/<item>/g) ?? []).length).toBe(1);
  });

  it("self-links under the collection basePath and embeds full html", () => {
    const rss = renderRss([samplePost], config);
    expect(rss).toContain(
      '<atom:link href="https://example.com/blog/rss.xml" rel="self"',
    );
    expect(rss).toContain("<content:encoded><![CDATA[<p>hi</p>]]>");
    const custom = renderRss([samplePost], config, { path: "/feed.xml" });
    expect(custom).toContain('href="https://example.com/feed.xml"');
  });

  it("emits rss categories by default but drops them when features.tags is false", () => {
    const on = renderRss([samplePost], config);
    expect(on).toContain("<category>intro</category>");
    expect(on).toContain("<category>css</category>");

    const offConfig: VoxxConfig = {
      ...config,
      features: { ...config.features, tags: false },
    };
    const off = renderRss([samplePost], offConfig);
    expect(off).not.toContain("<category>");
  });

  it("escapes markdown-breaking title chars in llms.txt and collapses newlines", () => {
    const post: Post = {
      ...samplePost,
      title: "Arrays[0] and [links]",
      description: "Line one\nLine two",
    };
    const txt = renderLlmsTxt([post], config);
    expect(txt).toContain("- [Arrays\\[0\\] and \\[links\\]]");
    expect(txt).toContain(
      "(https://example.com/blog/hello): Line one Line two",
    );
  });

  it("keeps the post body verbatim in llms-full.txt", () => {
    const post: Post = {
      ...samplePost,
      title: "Line one\nLine two",
      content: "Body with [brackets] kept raw.",
    };
    const full = renderLlmsFull([post], config);
    expect(full).toContain("# Line one Line two");
    expect(full).not.toContain("# Line one\nLine two");
    expect(full).toContain("Body with [brackets] kept raw.");
  });

  it("renders robots.txt pointing at the sitemap", () => {
    const robots = renderRobotsTxt(config);
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Sitemap: https://example.com/sitemap.xml");
  });

  it("renders sectioned llms.txt for multiple collections", () => {
    const txt = renderLlmsTxtSections(
      [
        { heading: "Posts", posts: [samplePost] },
        { heading: "Pages", posts: [] },
      ],
      config,
    );
    expect(txt).toContain("## Posts");
    expect(txt).toContain("## Pages");
  });

  it("finds posts from an already-loaded list", () => {
    expect(findPost([samplePost], "hello")?.title).toBe("Hello & Welcome");
    expect(findPost([samplePost], "/Hello/")?.title).toBe("Hello & Welcome");
    expect(findPost([samplePost], "nope")).toBeUndefined();
  });

  it("produces a sitemap with the index and post", () => {
    const xml = renderSitemap([samplePost], config);
    expect(xml).toContain("<loc>https://example.com/blog</loc>");
    expect(xml).toContain("<loc>https://example.com/blog/hello</loc>");
    expect((xml.match(/<url>/g) ?? []).length).toBe(2);
  });

  it("produces an llms.txt index", () => {
    const txt = renderLlmsTxt([samplePost], config);
    expect(txt).toContain("# Test Blog");
    expect(txt).toContain("> A test");
    expect(txt).toContain(
      "- [Hello & Welcome](https://example.com/blog/hello): An intro post",
    );
  });
});
