import { beforeAll, describe, expect, it } from "vitest";
import { Effect, Exit } from "effect";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEFAULT_CONFIG,
  VOXX_ASSET_PREFIX,
  absoluteUrl,
  buildNavTree,
  buildSeo,
  deriveExcerpt,
  findPost,
  getPost,
  getPosts,
  listPosts,
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
  serveContentAsset,
  slugify,
  splitOrderPrefix,
  formatDate,
  parseVersion,
  type Post,
  type VoxxConfig,
} from "../src/index";
import { parseFrontmatter } from "../src/frontmatter";
import { withVoxx } from "../src/next";

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

  it("fails with a tagged error instead of throwing on malformed YAML", async () => {
    const exit = await Effect.runPromiseExit(
      parseFrontmatter("malformed.md", "---\ntitle: [Unclosed\n---\nbody"),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const err = exit.cause;
      expect(JSON.stringify(err)).toContain("InvalidFrontmatter");
    }
  });

  it("parses an unterminated frontmatter block as YAML through the end of input", async () => {
    const parsed = await Effect.runPromise(
      parseFrontmatter("unterminated.md", "---\ntitle: Hi\ndate: 2026-01-02"),
    );
    expect(parsed.data.title).toBe("Hi");
    expect(parsed.data.date).toMatch(/^2026-01-02/);
    expect(parsed.content).toBe("");
  });

  it("does not treat a `---` line without a following newline as frontmatter", async () => {
    const exit = await Effect.runPromiseExit(
      parseFrontmatter("dashes.md", "---title: Hi\nbody"),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const err = exit.cause;
      expect(JSON.stringify(err)).toContain("InvalidFrontmatter");
    }
  });

  it("treats an empty, properly-closed frontmatter block as no data", async () => {
    // The block has no title, so this must fail schema validation — but on
    // a "missing title" error, not a YAML parse error. A splitter that
    // fails to find the shared newline between the empty open/close fences
    // would instead swallow "body" into the YAML block and throw there.
    const exit = await Effect.runPromiseExit(
      parseFrontmatter("empty-block.md", "---\n---\nbody"),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const json = JSON.stringify(exit.cause);
      expect(json).toContain("InvalidFrontmatter");
      expect(json).toContain("title");
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

  it("prepends assetPrefix to resolved assets when set", async () => {
    const dir = await mkdtemp(join(tmpdir(), "voxx-assets-"));
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(dir, "01-guides"), { recursive: true });
    await writeFile(
      join(dir, "01-guides", "pictures.md"),
      "---\ntitle: Pics\ndate: 2026-01-01\n---\n\n![diagram](./diagram.png)\n",
    );
    const content = { ...config.content, dir };
    const cfg: VoxxConfig = {
      ...config,
      content,
      collections: [{ name: "blog", ...content }],
    };
    const posts = await getPosts({
      config: cfg,
      assetPrefix: VOXX_ASSET_PREFIX,
    });
    expect(posts[0]!.html).toContain(
      `src="${VOXX_ASSET_PREFIX}/blog/01-guides/diagram.png"`,
    );
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

describe("serveContentAsset", () => {
  async function makeAssetConfig() {
    const dir = await mkdtemp(join(tmpdir(), "voxx-serve-"));
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(dir, "assets"), { recursive: true });
    await writeFile(
      join(dir, "assets", "diagram.png"),
      Buffer.from([0x89, 0x50]),
    );
    await writeFile(
      join(dir, "assets", "post.md"),
      "---\ntitle: Post\ndate: 2026-01-01\n---\n\nBody.\n",
    );
    await writeFile(join(dir, ".env"), "secret");
    const content = { ...config.content, dir };
    return {
      ...config,
      content,
      collections: [{ name: "blog", ...content }],
    } satisfies VoxxConfig;
  }

  it("serves a content asset from the collection's assets directory", async () => {
    const cfg = await makeAssetConfig();
    const response = await serveContentAsset(
      "/voxx-assets/blog/assets/diagram.png",
      { config: cfg },
    );
    expect(response).not.toBeNull();
    expect(response!.status).toBe(200);
    expect(response!.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await response!.arrayBuffer())).toEqual(
      Buffer.from([0x89, 0x50]),
    );
  });

  it("rejects markdown sources, dotfiles, traversal, and misses", async () => {
    const cfg = await makeAssetConfig();
    for (const pathname of [
      // Inside assets/, so these reach the SOURCE_RE check.
      "/voxx-assets/blog/assets/post.md",
      "/voxx-assets/blog/assets/post.MD",
      "/voxx-assets/blog/assets/post.Md",
      "/voxx-assets/blog/assets/post.mdx",
      "/voxx-assets/blog/.env",
      "/voxx-assets/blog/../secret.txt",
      "/voxx-assets/blog/missing.png",
      "/other/blog/diagram.png",
    ]) {
      expect(await serveContentAsset(pathname, { config: cfg })).toBeNull();
    }
  });

  it("never serves symlinks, even to files that exist", async () => {
    const cfg = await makeAssetConfig();
    const { symlink } = await import("node:fs/promises");
    const outside = await mkdtemp(join(tmpdir(), "voxx-outside-"));
    await writeFile(join(outside, "secret.png"), "leak");
    await symlink(
      join(outside, "secret.png"),
      join(cfg.content.dir, "assets", "escape.png"),
    );
    expect(
      await serveContentAsset("/voxx-assets/blog/assets/escape.png", {
        config: cfg,
      }),
    ).toBeNull();
  });

  it("rejects symlinks that resolve to non-asset files inside the collection", async () => {
    const cfg = await makeAssetConfig();
    const { symlink } = await import("node:fs/promises");
    // Stays inside the collection dir but resolves to Markdown source.
    await symlink(
      join(cfg.content.dir, "assets", "post.md"),
      join(cfg.content.dir, "assets", "logo.png"),
    );
    expect(
      await serveContentAsset("/voxx-assets/blog/assets/logo.png", {
        config: cfg,
      }),
    ).toBeNull();
  });

  it("does not fall through to a shorter collection when the longest match misses", async () => {
    const dir = await mkdtemp(join(tmpdir(), "voxx-leak-"));
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(dir, "guides", "assets"), { recursive: true });
    await writeFile(join(dir, "guides", "assets", "logo.svg"), "<svg/>");
    const shared = { ...config.content, dir };
    const docsDir = await mkdtemp(join(tmpdir(), "voxx-docs-"));
    const cfg: VoxxConfig = {
      ...config,
      content: shared,
      collections: [
        { name: "blog", ...shared },
        {
          name: "docs",
          ...config.content,
          dir: docsDir,
          basePath: "/blog/guides",
        },
      ],
    };
    // The docs collection owns /blog/guides/*; blog's file at the same
    // relative layout must not be substituted for its missing one.
    expect(
      await serveContentAsset("/voxx-assets/blog/guides/assets/logo.svg", {
        config: cfg,
      }),
    ).toBeNull();
  });

  it("only serves files below an assets/ directory", async () => {
    const cfg = await makeAssetConfig();
    for (const pathname of [
      "/voxx-assets/blog/diagram.png",
      "/voxx-assets/blog/assets",
      "/voxx-assets/blog/assets/",
      "/voxx-assets/blog/myassets/diagram.png",
    ]) {
      expect(await serveContentAsset(pathname, { config: cfg })).toBeNull();
    }
  });

  it("serves assets when the configured dir has unnormalized separators", async () => {
    const base = await mkdtemp(join(tmpdir(), "voxx-norm-"));
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(base, "assets"), { recursive: true });
    await writeFile(join(base, "assets", "a.png"), "png");
    // resolveConfig passes absolute dirs through verbatim, so a raw dir like
    // this reaches the containment check unnormalized.
    const content = { ...config.content, dir: `${base}/./` };
    const cfg: VoxxConfig = {
      ...config,
      content,
      collections: [{ name: "blog", ...content }],
    };
    const response = await serveContentAsset("/voxx-assets/blog/assets/a.png", {
      config: cfg,
    });
    expect(response).not.toBeNull();
    expect(response!.headers.get("content-type")).toBe("image/png");
  });

  it("rejects encoded backslash separators", async () => {
    const cfg = await makeAssetConfig();
    expect(
      await serveContentAsset("/voxx-assets/blog/a%5C..%5C..%5C.env", {
        config: cfg,
      }),
    ).toBeNull();
  });

  it("matches the longest basePath when collections nest", async () => {
    const dir = await mkdtemp(join(tmpdir(), "voxx-nest-"));
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(dir, "assets"), { recursive: true });
    await writeFile(join(dir, "assets", "logo.svg"), "<svg/>");
    const shared = { ...config.content, dir };
    const docsDir = await mkdtemp(join(tmpdir(), "voxx-docs-"));
    await mkdir(join(docsDir, "assets"), { recursive: true });
    await writeFile(join(docsDir, "assets", "cover.png"), "png");
    const cfg: VoxxConfig = {
      ...config,
      content: shared,
      collections: [
        { name: "blog", ...shared },
        {
          name: "docs",
          ...config.content,
          dir: docsDir,
          basePath: "/blog/guides",
        },
      ],
    };
    const logo = await serveContentAsset("/voxx-assets/blog/assets/logo.svg", {
      config: cfg,
    });
    expect(logo?.headers.get("content-type")).toBe("image/svg+xml");
    const cover = await serveContentAsset(
      "/voxx-assets/blog/guides/assets/cover.png",
      { config: cfg },
    );
    expect(cover?.headers.get("content-type")).toBe("image/png");
  });
});

describe("listing, filtering, and pagination", () => {
  async function makeManyPostsDir() {
    const dir = await mkdtemp(join(tmpdir(), "voxx-list-"));
    for (let i = 1; i <= 5; i++) {
      const month = String(i).padStart(2, "0");
      const tag = i % 2 === 0 ? "even" : "odd";
      await writeFile(
        join(dir, `post-${i}.md`),
        `---\ntitle: Post ${i}\ndate: 2026-${month}-01\ntags: [${tag}]\ncategory: ${
          i <= 2 ? "news" : "guides"
        }\n---\n\nBody ${i}.\n`,
      );
    }
    return {
      ...config,
      content: { ...config.content, dir },
    } satisfies VoxxConfig;
  }

  it("returns metadata with a total and renders nothing", async () => {
    const cfg = await makeManyPostsDir();
    const { posts, total } = await listPosts({ config: cfg });
    expect(total).toBe(5);
    expect(posts.map((p) => p.slug)).toEqual([
      "post-5",
      "post-4",
      "post-3",
      "post-2",
      "post-1",
    ]);
    // PostMeta carries no rendered body.
    expect(posts[0]).not.toHaveProperty("html");
    expect(posts[0]).not.toHaveProperty("content");
  });

  it("paginates with offset and limit while reporting the full total", async () => {
    const cfg = await makeManyPostsDir();
    const page1 = await listPosts({ config: cfg, limit: 2 });
    expect(page1.total).toBe(5);
    expect(page1.posts.map((p) => p.slug)).toEqual(["post-5", "post-4"]);

    const page2 = await listPosts({ config: cfg, limit: 2, offset: 2 });
    expect(page2.total).toBe(5);
    expect(page2.posts.map((p) => p.slug)).toEqual(["post-3", "post-2"]);

    const page3 = await listPosts({ config: cfg, limit: 2, offset: 4 });
    expect(page3.posts.map((p) => p.slug)).toEqual(["post-1"]);
  });

  it("filters by tag and category, counting only matches in total", async () => {
    const cfg = await makeManyPostsDir();
    const even = await listPosts({ config: cfg, tag: "even" });
    expect(even.total).toBe(2);
    expect(even.posts.map((p) => p.slug)).toEqual(["post-4", "post-2"]);

    const news = await listPosts({ config: cfg, category: "news" });
    expect(news.total).toBe(2);
    expect(news.posts.map((p) => p.slug)).toEqual(["post-2", "post-1"]);
  });

  it("applies filters and pagination to getPosts before rendering", async () => {
    const cfg = await makeManyPostsDir();
    const posts = await getPosts({ config: cfg, tag: "odd", limit: 2 });
    expect(posts.map((p) => p.slug)).toEqual(["post-5", "post-3"]);
    // getPosts renders only what it returns.
    expect(posts[0]!.html).toContain("Body 5");
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
      authors: [
        { name: "Jane Doe", url: "https://jane.example" },
        { name: "Sam" },
      ],
    };
    const seo = buildSeo(multi, config);
    expect(seo.openGraph?.authors).toEqual(["Jane Doe", "Sam"]);
    expect(seo.jsonLd?.["author"]).toEqual([
      { "@type": "Person", name: "Jane Doe", url: "https://jane.example" },
      { "@type": "Person", name: "Sam" },
    ]);
  });

  it("uses a single Person object when there is one author", () => {
    const one = buildSeo(
      { ...samplePost, authors: [{ name: "Solo" }] },
      config,
    );
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

describe("withVoxx", () => {
  const cwd = tmpdir();

  it("wires serverless plumbing without touching rendering mode", () => {
    const result = withVoxx({}, { cwd }) as Record<string, unknown>;
    expect("cacheComponents" in result).toBe(false);
    expect(result["serverExternalPackages"]).toContain(
      "@prudentbird/voxx-core",
    );
    expect(result["outputFileTracingIncludes"]).toBeDefined();
  });

  it("passes cacheComponents through untouched when the host sets it", () => {
    const on = withVoxx({ cacheComponents: true }, { cwd }) as Record<
      string,
      unknown
    >;
    expect(on["cacheComponents"]).toBe(true);

    const off = withVoxx({ cacheComponents: false }, { cwd }) as Record<
      string,
      unknown
    >;
    expect(off["cacheComponents"]).toBe(false);
  });

  it("preserves and merges existing managed fields", () => {
    const result = withVoxx(
      { serverExternalPackages: ["keep-me"] },
      { cwd },
    ) as Record<string, unknown>;
    const externals = result["serverExternalPackages"] as string[];
    expect(externals).toContain("keep-me");
    expect(externals).toContain("@prudentbird/voxx-core");
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
