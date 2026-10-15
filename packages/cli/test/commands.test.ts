import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listPosts } from "@prudentbird/voxx-core";
import { build } from "../src/commands/build";
import { newPost } from "../src/commands/new";
import { init } from "../src/commands/init";
import { add } from "../src/commands/add";
import { remove } from "../src/commands/remove";
import { exists, log } from "../src/util";
import * as prompts from "../src/prompts";
import * as project from "../src/project";

const originalCwd = process.cwd();
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "voxx-cli-"));
  process.chdir(dir);
  process.exitCode = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  process.chdir(originalCwd);
  process.exitCode = 0;
});

async function writeConfig(overrides: Record<string, unknown> = {}) {
  await writeFile(
    join(dir, "voxx.json"),
    JSON.stringify({
      site: {
        title: "Test Site",
        description: "A test site",
        url: "https://test.dev",
      },
      content: { type: "blog", dir: "content", basePath: "/blog" },
      ...overrides,
    }),
  );
}

async function writePost(rel: string, frontmatter: string, body: string) {
  const target = join(dir, "content", rel);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, `---\n${frontmatter}\n---\n\n${body}\n`);
}

describe("voxx build", () => {
  it("renders pages, feeds, robots, and llms files", async () => {
    await writeConfig();
    await writePost("hello.md", "title: Hello\ndate: 2026-01-01", "Hi there.");
    await build([]);

    expect(await exists(join(dir, "dist/blog/index.html"))).toBe(true);
    expect(await exists(join(dir, "dist/blog/hello/index.html"))).toBe(true);
    expect(await exists(join(dir, "dist/llms-full.txt"))).toBe(true);

    const rss = await readFile(join(dir, "dist/blog/rss.xml"), "utf8");
    expect(rss).toContain('href="https://test.dev/blog/rss.xml" rel="self"');
    expect(rss).toContain("<content:encoded>");

    const robots = await readFile(join(dir, "dist/robots.txt"), "utf8");
    expect(robots).toContain("Sitemap: https://test.dev/sitemap.xml");
  });

  it("copies content assets and resolves relative references", async () => {
    await writeConfig();
    await writePost(
      "pics.md",
      "title: Pics\ndate: 2026-01-01",
      "![d](./assets/diagram.png)",
    );
    await mkdir(join(dir, "content/assets"), { recursive: true });
    await writeFile(
      join(dir, "content", "assets/diagram.png"),
      "not-a-real-png",
    );
    await build([]);

    expect(await exists(join(dir, "dist/blog/assets/diagram.png"))).toBe(true);
    const html = await readFile(join(dir, "dist/blog/pics/index.html"), "utf8");
    expect(html).toContain('src="../../blog/assets/diagram.png"');
  });

  it("copies nested content assets preserving their relative path", async () => {
    await writeConfig({
      content: { type: "docs", dir: "content", basePath: "/docs" },
    });
    await writePost("guides/page.md", "title: Guide", "![i](./assets/img.png)");
    await mkdir(join(dir, "content/guides/assets"), { recursive: true });
    await writeFile(
      join(dir, "content/guides/assets/img.png"),
      "not-a-real-png",
    );
    await build([]);
    expect(await exists(join(dir, "dist/docs/guides/assets/img.png"))).toBe(
      true,
    );
  });

  it("hides drafts by default but honors drafts:true in config", async () => {
    await writeConfig();
    await writePost("live.md", "title: Live\ndate: 2026-01-01", "Live.");
    await writePost(
      "wip.md",
      "title: WIP\ndate: 2026-01-02\ndraft: true",
      "WIP.",
    );

    await build([]);
    expect(await exists(join(dir, "dist/blog/wip/index.html"))).toBe(false);

    await build(["--drafts", "--out", "dist2"]);
    expect(await exists(join(dir, "dist2/blog/wip/index.html"))).toBe(true);

    await writeConfig({
      content: {
        type: "blog",
        dir: "content",
        basePath: "/blog",
        drafts: true,
      },
    });
    await build(["--out", "dist3"]);
    expect(await exists(join(dir, "dist3/blog/wip/index.html"))).toBe(true);
  });

  it.each([
    { drafts: "unlisted", args: [], noindex: true },
    { drafts: false, args: ["--drafts"], noindex: true },
    { drafts: true, args: [], noindex: false },
  ])(
    "renders draft robots with drafts: $drafts and args: $args",
    async ({ drafts, args, noindex }) => {
      await writeConfig({
        content: { type: "blog", dir: "content", basePath: "/blog", drafts },
      });
      await writePost(
        "wip.md",
        "title: WIP\ndate: 2026-01-02\ndraft: true",
        "WIP.",
      );
      await writePost("live.md", "title: Live\ndate: 2026-01-01", "Live.");
      await build(args);

      const draft = await readFile(
        join(dir, "dist/blog/wip/index.html"),
        "utf8",
      );
      const live = await readFile(
        join(dir, "dist/blog/live/index.html"),
        "utf8",
      );
      expect(
        draft.includes('<meta name="robots" content="noindex, nofollow">'),
      ).toBe(noindex);
      expect(live).not.toContain('<meta name="robots"');
    },
  );

  it.each([
    { drafts: false, args: ["--drafts"], containsDraft: true, noindex: true },
    {
      drafts: "unlisted",
      args: ["--drafts"],
      containsDraft: true,
      noindex: true,
    },
    { drafts: true, args: [], containsDraft: true, noindex: false },
    { drafts: "unlisted", args: [], containsDraft: false, noindex: false },
    { drafts: false, args: [], containsDraft: false, noindex: false },
  ])(
    "sets changelog index robots for drafts: $drafts and args: $args",
    async ({ drafts, args, containsDraft, noindex }) => {
      await writeConfig({
        content: {
          type: "changelog",
          dir: "content",
          basePath: "/changelog",
          drafts,
        },
      });
      await writePost(
        "1.0.0.md",
        "title: Live release\ndate: 2026-01-01",
        "Released content.",
      );
      await writePost(
        "2.0.0.md",
        "title: Preview release\ndate: 2026-01-02\ndraft: true",
        "Preview release content.",
      );
      await build(args);
      const html = await readFile(
        join(dir, "dist/changelog/index.html"),
        "utf8",
      );
      expect(html.includes("Preview release content.")).toBe(containsDraft);
      expect(
        html.includes('<meta name="robots" content="noindex, nofollow">'),
      ).toBe(noindex);
      expect(html).toContain("Released content.");
    },
  );

  it("builds every collection in a multi-collection config", async () => {
    await writeConfig({
      content: undefined,
      collections: [
        { name: "blog", dir: "content/blog" },
        { name: "docs", type: "docs", dir: "content/docs" },
      ],
    });
    await mkdir(join(dir, "content/blog"), { recursive: true });
    await mkdir(join(dir, "content/docs"), { recursive: true });
    await writeFile(
      join(dir, "content/blog/post.md"),
      "---\ntitle: Post\ndate: 2026-01-01\n---\n\nBody.\n",
    );
    await writeFile(
      join(dir, "content/docs/guide.md"),
      "---\ntitle: Guide\n---\n\nBody.\n",
    );
    await build([]);

    expect(await exists(join(dir, "dist/blog/post/index.html"))).toBe(true);
    expect(await exists(join(dir, "dist/docs/guide/index.html"))).toBe(true);

    const rss = await readFile(join(dir, "dist/blog/rss.xml"), "utf8");
    expect(rss).toContain('href="https://test.dev/blog/rss.xml" rel="self"');
    expect(await exists(join(dir, "dist/rss.xml"))).toBe(false);

    const sitemap = await readFile(join(dir, "dist/sitemap.xml"), "utf8");
    expect(sitemap).toContain("<loc>https://test.dev/blog</loc>");
    expect(sitemap).toContain("<loc>https://test.dev/docs</loc>");
    expect(sitemap).toContain("<loc>https://test.dev/docs/guide</loc>");

    const llms = await readFile(join(dir, "dist/llms.txt"), "utf8");
    expect(llms).toContain("## Blog");
    expect(llms).toContain("## Docs");
  });

  it.each([false, true])(
    "emits only the changelog index in the sitemap (multi: %s)",
    async (multi) => {
      await writeConfig({
        content: multi
          ? undefined
          : { type: "changelog", dir: "content", basePath: "/changelog" },
        ...(multi
          ? {
              collections: [
                { name: "blog", dir: "content/blog" },
                {
                  name: "changelog",
                  type: "changelog",
                  dir: "content/changelog",
                },
              ],
            }
          : {}),
        features: { sitemap: true },
      });
      if (multi) {
        await writePost(
          "blog/hello.md",
          "title: Hello\ndate: 2026-03-01",
          "Hello.",
        );
      }
      const prefix = multi ? "changelog/" : "";
      await writePost(
        `${prefix}v1-2-0.md`,
        "title: v1.2.0\ndate: 2026-02-01\nupdated: 2026-02-03",
        "Latest.",
      );
      await writePost(
        `${prefix}v1-1-0.md`,
        "title: v1.1.0\ndate: 2026-01-01",
        "Older.",
      );
      await build([]);

      expect(process.exitCode).toBe(0);
      const sitemap = await readFile(join(dir, "dist/sitemap.xml"), "utf8");
      expect(sitemap).not.toContain("#");
      expect(
        sitemap.match(/<loc>https:\/\/test.dev\/changelog<\/loc>/g),
      ).toHaveLength(1);
      expect(sitemap).toContain(
        "<loc>https://test.dev/changelog</loc>\n    <lastmod>2026-02-03</lastmod>",
      );
      expect(sitemap.match(/<url>/g)).toHaveLength(multi ? 3 : 1);
    },
  );

  it("fails cleanly without voxx.json", async () => {
    await build([]);
    expect(process.exitCode).toBe(1);
  });
});

describe("voxx new", () => {
  it.each(["404", "Null", "true", "false", "2026-06-01", "1e3", "0xFF"])(
    "preserves the title and derived slug for %s through a build",
    async (title) => {
      await writeConfig();
      await newPost([title, "--date", "2026-06-01"]);
      const { posts } = await listPosts();
      expect(posts).toHaveLength(1);
      expect(posts[0]?.title).toBe(title);
      expect(posts[0]?.slug).toBe(title.toLowerCase());
      await build([]);
      expect(process.exitCode).toBe(0);
      expect(
        await exists(join(dir, `dist/blog/${title.toLowerCase()}/index.html`)),
      ).toBe(true);
    },
  );

  it.each(["404", "null", "true", "2026-06-01"])(
    "preserves an explicit %s slug through a build",
    async (slug) => {
      await writeConfig();
      await newPost(["Post", "--slug", slug, "--date", "2026-06-01"]);
      const raw = await readFile(
        join(dir, `content/2026-06-01-${slug}.md`),
        "utf8",
      );
      expect(raw).toContain(`slug: "${slug}"`);
      const { posts } = await listPosts();
      expect(posts[0]?.slug).toBe(slug);
      await build([]);
      expect(process.exitCode).toBe(0);
      expect(await exists(join(dir, `dist/blog/${slug}/index.html`))).toBe(true);
    },
  );

  it("creates a dated blog post", async () => {
    await writeConfig();
    await newPost(["My First Post", "--date", "2026-06-01"]);
    const file = join(dir, "content", "2026-06-01-my-first-post.md");
    expect(await exists(file)).toBe(true);
    const raw = await readFile(file, "utf8");
    expect(raw).toContain('title: "My First Post"');
    expect(raw).toContain('slug: "my-first-post"');
  });

  it("survives a build round-trip with a colon in the title", async () => {
    await writeConfig();
    await newPost(["Release 1.0: The Big One", "--date", "2026-06-01"]);
    await build([]);
    expect(process.exitCode).not.toBe(1);
    expect(
      await exists(join(dir, "dist/blog/release-1-0-the-big-one/index.html")),
    ).toBe(true);
  });

  it("rejects an invalid --date", async () => {
    await writeConfig();
    await newPost(["Post", "--date", "junk"]);
    expect(process.exitCode).toBe(1);
    expect(await exists(join(dir, "content", "junk-post.md"))).toBe(false);
  });

  it("targets a named collection with --collection", async () => {
    await writeConfig({
      content: undefined,
      collections: [
        { name: "blog", dir: "content/blog" },
        { name: "docs", type: "docs", dir: "content/docs" },
      ],
    });
    await newPost(["Install Guide", "--collection", "docs"]);
    const file = join(dir, "content/docs/install-guide.md");
    expect(await exists(file)).toBe(true);
    const raw = await readFile(file, "utf8");
    expect(raw).toContain('title: "Install Guide"');
    expect(raw).not.toContain("date:");
    expect(raw).not.toContain("tags:");
  });

  it("rejects an unknown --collection without creating a file", async () => {
    await writeConfig({
      content: undefined,
      collections: [
        { name: "blog", dir: "content/blog" },
        { name: "docs", type: "docs", dir: "content/docs" },
      ],
    });
    await newPost(["Lost Page", "--collection", "nope"]);
    expect(process.exitCode).toBe(1);
    expect(await exists(join(dir, "content/blog/lost-page.md"))).toBe(false);
    expect(await exists(join(dir, "content/docs/lost-page.md"))).toBe(false);
  });

  it("targets the first collection when --collection is omitted", async () => {
    await writeConfig({
      content: undefined,
      collections: [
        { name: "blog", dir: "content/blog" },
        { name: "docs", type: "docs", dir: "content/docs" },
      ],
    });
    await newPost(["First Wins", "--date", "2026-06-01"]);
    expect(
      await exists(join(dir, "content/blog/2026-06-01-first-wins.md")),
    ).toBe(true);
  });

  it("creates an ordered docs page in a section", async () => {
    await writeConfig({
      content: { type: "docs", dir: "content", basePath: "/docs" },
    });
    await newPost(["Install", "--section", "getting-started", "--order", "1"]);
    expect(
      await exists(join(dir, "content/getting-started/01-install.md")),
    ).toBe(true);
  });

  it("rejects a --section that escapes the content directory", async () => {
    await writeConfig({
      content: { type: "docs", dir: "content", basePath: "/docs" },
    });
    await newPost(["Post", "--section", "../../escape"]);
    expect(process.exitCode).toBe(1);
    expect(await exists(join(dir, "../escape"))).toBe(false);
  });

  it("rejects a --dir that escapes the project", async () => {
    await writeConfig();
    await newPost(["Post", "--dir", "../outside", "--date", "2026-06-01"]);
    expect(process.exitCode).toBe(1);
    expect(await exists(join(dir, "../outside"))).toBe(false);
  });

  it("rejects a traversal changelog name", async () => {
    await writeConfig({
      content: { type: "changelog", dir: "content", basePath: "/" },
    });
    await newPost(["../../evil"]);
    expect(process.exitCode).toBe(1);
    expect(await exists(join(dir, "../evil.md"))).toBe(false);
  });

  it("allows a legitimate nested --section", async () => {
    await writeConfig({
      content: { type: "docs", dir: "content", basePath: "/docs" },
    });
    await newPost(["Page", "--section", "guides/intro"]);
    expect(await exists(join(dir, "content/guides/intro/page.md"))).toBe(true);
  });

  it("creates a docs section index.md with --index", async () => {
    await writeConfig({
      content: { type: "docs", dir: "content", basePath: "/docs" },
    });
    await newPost([
      "Getting Started",
      "--section",
      "getting-started",
      "--index",
    ]);
    const file = join(dir, "content/getting-started/index.md");
    expect(await exists(file)).toBe(true);
    expect(await readFile(file, "utf8")).toContain('title: "Getting Started"');
  });

  it("creates a top-level index.md with --index and no section", async () => {
    await writeConfig({
      content: { type: "docs", dir: "content", basePath: "/docs" },
    });
    await newPost(["Top", "--index"]);
    expect(await exists(join(dir, "content/index.md"))).toBe(true);
  });

  it("rejects --index on a non-docs collection", async () => {
    await writeConfig();
    await newPost(["X", "--index"]);
    expect(process.exitCode).toBe(1);
    expect(await exists(join(dir, "content/index.md"))).toBe(false);
  });

  it("still creates a normal docs page without --index", async () => {
    await writeConfig({
      content: { type: "docs", dir: "content", basePath: "/docs" },
    });
    await newPost(["Normal Page", "--section", "getting-started"]);
    expect(
      await exists(join(dir, "content/getting-started/normal-page.md")),
    ).toBe(true);
  });
});

async function nextApp() {
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ name: "my-app", dependencies: { next: "16.0.0" } }),
  );
  await mkdir(join(dir, "app"), { recursive: true });
}

describe("voxx add collection", () => {
  it("migrates a single-collection config and scaffolds the new collection", async () => {
    await nextApp();
    await init(["blog"]);
    await add(["collection", "docs"]);
    expect(process.exitCode).not.toBe(1);

    const cfg = JSON.parse(await readFile(join(dir, "voxx.json"), "utf8"));
    expect(cfg.content).toBeUndefined();
    expect(cfg.collections).toEqual([
      {
        name: "blog",
        type: "blog",
        dir: "app/(voxx)/blog/_content",
        basePath: "/blog",
        drafts: false,
      },
      {
        name: "docs",
        type: "docs",
        dir: "app/(voxx)/docs/_content",
        basePath: "/docs",
        drafts: false,
      },
    ]);

    expect(
      await exists(join(dir, "app/(voxx)/docs/[[...slug]]/page.tsx")),
    ).toBe(true);
    expect(await exists(join(dir, "app/(voxx)/docs/_content/index.md"))).toBe(
      true,
    );
    const data = await readFile(join(dir, "app/(voxx)/docs/_data.ts"), "utf8");
    expect(data).toContain('assetPrefix: VOXX_ASSET_PREFIX');
    expect(data).toContain('{ collection: "docs" }');

    const sitemap = await readFile(join(dir, "app/(voxx)/sitemap.ts"), "utf8");
    expect(sitemap).toContain("./blog/_data");
  });

  it("appends to an existing collections array without touching entries", async () => {
    await writeConfig({
      content: undefined,
      collections: [{ name: "blog", dir: "content/blog" }],
    });
    await add(["collection", "changelog"]);
    expect(process.exitCode).not.toBe(1);
    const cfg = JSON.parse(await readFile(join(dir, "voxx.json"), "utf8"));
    expect(cfg.collections).toEqual([
      { name: "blog", dir: "content/blog" },
      {
        name: "changelog",
        type: "changelog",
        dir: "content/changelog",
        basePath: "/changelog",
        drafts: false,
      },
    ]);
    expect(await exists(join(dir, "content/changelog/0.1.0.md"))).toBe(true);
  });

  it("requires an existing voxx.json", async () => {
    await add(["collection", "docs"]);
    expect(process.exitCode).toBe(1);
    expect(await exists(join(dir, "voxx.json"))).toBe(false);
    expect(await exists(join(dir, "content/docs/index.md"))).toBe(false);
  });

  it("errors on name, basePath, and dir collisions without writing", async () => {
    await writeConfig();
    const before = await readFile(join(dir, "voxx.json"), "utf8");

    await add(["collection", "blog"]);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;

    await add(["collection", "docs", "--base", "/blog"]);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;

    await add(["collection", "docs", "--dir", "content"]);
    expect(process.exitCode).toBe(1);

    expect(await readFile(join(dir, "voxx.json"), "utf8")).toBe(before);
    expect(await exists(join(dir, "content/docs"))).toBe(false);
  });

  it("resolves a name collision via --name", async () => {
    await writeConfig({
      content: undefined,
      collections: [{ name: "docs", type: "docs", dir: "content/docs" }],
    });
    await add(["collection", "docs", "--name", "guides"]);
    expect(process.exitCode).not.toBe(1);
    const cfg = JSON.parse(await readFile(join(dir, "voxx.json"), "utf8"));
    expect(cfg.collections[1]).toMatchObject({
      name: "guides",
      type: "docs",
      dir: "content/guides",
      basePath: "/guides",
    });
    expect(await exists(join(dir, "content/guides/index.md"))).toBe(true);
  });
});

describe("voxx init (static, non-TTY)", () => {
  it("writes voxx.json and sample content", async () => {
    await init(["blog"]);
    expect(await exists(join(dir, "voxx.json"))).toBe(true);
    const today = new Date().toISOString().slice(0, 10);
    expect(
      await exists(join(dir, `content/blog/${today}-hello-world.md`)),
    ).toBe(true);
    const cfg = JSON.parse(await readFile(join(dir, "voxx.json"), "utf8"));
    expect(cfg.content.type).toBe("blog");
  });

  it("scaffolds two collections together with --yes", async () => {
    await init(["blog", "docs", "--yes"]);
    expect(process.exitCode).not.toBe(1);
    const cfg = JSON.parse(await readFile(join(dir, "voxx.json"), "utf8"));
    expect(cfg.collections.map((c: { name: string }) => c.name)).toEqual([
      "blog",
      "docs",
    ]);
    expect(await exists(join(dir, "content/docs/index.md"))).toBe(true);
  });

  it("names a single collection with --name", async () => {
    await init(["blog", "--name", "posts", "--yes"]);
    const cfg = JSON.parse(await readFile(join(dir, "voxx.json"), "utf8"));
    expect(cfg.content).toMatchObject({
      type: "blog",
      dir: "content/posts",
      basePath: "/posts",
    });
    expect(await exists(join(dir, "content/posts"))).toBe(true);
  });

  it("rejects a --dir that escapes the project", async () => {
    await init(["blog", "--dir", "../outside"]);
    expect(process.exitCode).toBe(1);
    expect(await exists(join(dir, "voxx.json"))).toBe(false);
    expect(await exists(join(dir, "../outside"))).toBe(false);
  });

  it("rejects --name with multiple collection types", async () => {
    await init(["blog", "docs", "--name", "x", "--yes"]);
    expect(process.exitCode).toBe(1);
    expect(await exists(join(dir, "voxx.json"))).toBe(false);
  });
});

describe("voxx init feature gating (Next.js)", () => {
  it("omits route files for disabled features", async () => {
    await nextApp();
    await init(["blog", "--no-sitemap", "--no-llms", "--yes"]);

    expect(await exists(join(dir, "app/(voxx)/blog/page.tsx"))).toBe(true);
    expect(await exists(join(dir, "app/(voxx)/blog/rss.xml/route.ts"))).toBe(
      true,
    );
    expect(await exists(join(dir, "app/(voxx)/robots.ts"))).toBe(true);
    expect(await exists(join(dir, "app/(voxx)/sitemap.ts"))).toBe(false);
    expect(await exists(join(dir, "app/(voxx)/llms.txt/route.ts"))).toBe(false);
    expect(await exists(join(dir, "app/(voxx)/llms-full.txt/route.ts"))).toBe(
      false,
    );

    const cfg = JSON.parse(await readFile(join(dir, "voxx.json"), "utf8"));
    expect(cfg.features).toMatchObject({ sitemap: false, llmsTxt: false });
  });

  it("scaffolds the default blog routes when no features are disabled", async () => {
    await nextApp();
    await init(["blog", "--yes"]);
    expect(await exists(join(dir, "app/(voxx)/sitemap.ts"))).toBe(true);
    expect(await exists(join(dir, "app/(voxx)/robots.ts"))).toBe(true);
    expect(await exists(join(dir, "app/(voxx)/llms.txt/route.ts"))).toBe(true);
    const data = await readFile(join(dir, "app/(voxx)/blog/_data.ts"), "utf8");
    expect(data).toContain("export async function listPosts");
    expect(data).toContain("export async function getPost");
  });
});

describe("voxx add / remove feature", () => {
  it.each(["confirm", "--yes"])(
    "preserves routes when config cannot be written after %s",
    async (approval) => {
      await nextApp();
      await writeConfig({ features: { llmsTxt: true } });
      const paths = [
        "voxx.json",
        "app/(voxx)/llms.txt/route.ts",
        "app/(voxx)/llms-full.txt/route.ts",
      ];
      for (const path of paths.slice(1)) {
        await mkdir(join(dir, path, ".."), { recursive: true });
        await writeFile(join(dir, path), `// custom ${path}\n`);
      }
      const before = await Promise.all(
        paths.map((path) => readFile(join(dir, path), "utf8")),
      );
      vi.spyOn(prompts, "canPrompt").mockReturnValue(approval === "confirm");
      const confirm = vi
        .spyOn(prompts, "promptConfirm")
        .mockResolvedValue(true);
      const error = new Error("voxx.json is not writable");
      vi.spyOn(project, "writeConfig").mockRejectedValue(error);

      await expect(
        remove(["llms", ...(approval === "confirm" ? [] : [approval])]),
      ).rejects.toBe(error);

      expect(confirm).toHaveBeenCalledTimes(approval === "confirm" ? 1 : 0);
      expect(
        await Promise.all(
          paths.map((path) => readFile(join(dir, path), "utf8")),
        ),
      ).toEqual(before);
    },
  );

  it.each(["cancel", "decline", "non-interactive"])(
    "leaves config and route contents untouched on remove %s",
    async (mode) => {
      await nextApp();
      await init(["blog", "--yes"]);
      const paths = [
        "voxx.json",
        "app/(voxx)/llms.txt/route.ts",
        "app/(voxx)/llms-full.txt/route.ts",
      ];
      const before = await Promise.all(
        paths.map((path) => readFile(join(dir, path), "utf8")),
      );
      vi.spyOn(prompts, "canPrompt").mockReturnValue(
        mode !== "non-interactive",
      );
      const confirm = vi.spyOn(prompts, "promptConfirm");
      if (mode === "cancel") {
        confirm.mockRejectedValue(new prompts.PromptCancelled());
      } else {
        confirm.mockResolvedValue(false);
      }
      const error = vi.spyOn(log, "error").mockImplementation(() => {});
      const info = vi.spyOn(log, "info").mockImplementation(() => {});

      await remove(["llms"]);

      expect(
        await Promise.all(
          paths.map((path) => readFile(join(dir, path), "utf8")),
        ),
      ).toEqual(before);
      expect(process.exitCode).toBe(mode === "decline" ? 0 : 1);
      if (mode === "non-interactive") {
        expect(confirm).not.toHaveBeenCalled();
        expect(error.mock.calls.flat().join(" ")).toContain("--yes");
        for (const path of [
          "app/(voxx)/llms.txt",
          "app/(voxx)/llms-full.txt",
        ]) {
          expect(info.mock.calls.flat().join(" ")).toContain(path);
        }
      } else {
        expect(confirm).toHaveBeenCalledWith({
          message: "Delete them?",
          initialValue: false,
        });
      }
    },
  );

  it.each(["confirm", "--force", "--yes", "-y"])(
    "removes routes and updates config with %s",
    async (approval) => {
      await nextApp();
      await init(["blog", "--yes"]);
      const before = await readFile(join(dir, "voxx.json"), "utf8");
      vi.spyOn(prompts, "canPrompt").mockReturnValue(approval === "confirm");
      const confirm = vi
        .spyOn(prompts, "promptConfirm")
        .mockImplementation(async () => {
          expect(await readFile(join(dir, "voxx.json"), "utf8")).toBe(before);
          expect(await exists(join(dir, "app/(voxx)/sitemap.ts"))).toBe(true);
          return true;
        });

      await remove(["sitemap", ...(approval === "confirm" ? [] : [approval])]);

      expect(process.exitCode).toBe(0);
      expect(await exists(join(dir, "app/(voxx)/sitemap.ts"))).toBe(false);
      const cfg = JSON.parse(await readFile(join(dir, "voxx.json"), "utf8"));
      expect(cfg.features.sitemap).toBe(false);
      expect(confirm).toHaveBeenCalledTimes(approval === "confirm" ? 1 : 0);
    },
  );

  it("updates config without confirmation when no route files exist", async () => {
    await nextApp();
    await writeConfig({ features: { sitemap: true } });
    vi.spyOn(prompts, "canPrompt").mockReturnValue(false);
    await remove(["sitemap"]);
    expect(process.exitCode).toBe(0);
    const cfg = JSON.parse(await readFile(join(dir, "voxx.json"), "utf8"));
    expect(cfg.features.sitemap).toBe(false);
  });

  it.each(["feature", "collection"])(
    "leaves config and files untouched when add %s overwrite is cancelled",
    async (target) => {
      await nextApp();
      await init(["blog", "--no-sitemap", "--yes"]);
      const route = join(
        dir,
        target === "feature"
          ? "app/(voxx)/sitemap.ts"
          : "app/(voxx)/docs/[[...slug]]/page.tsx",
      );
      await mkdir(join(route, ".."), { recursive: true });
      await writeFile(route, "// user route\n");
      const before = await readFile(join(dir, "voxx.json"), "utf8");
      vi.spyOn(prompts, "canPrompt").mockReturnValue(true);
      const confirm = vi
        .spyOn(prompts, "promptConfirm")
        .mockRejectedValue(new prompts.PromptCancelled());

      await add(target === "feature" ? ["sitemap"] : ["collection", "docs"]);

      expect(confirm).toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
      expect(await readFile(join(dir, "voxx.json"), "utf8")).toBe(before);
      expect(await readFile(route, "utf8")).toBe("// user route\n");
      expect(await exists(join(dir, "app/(voxx)/docs/_data.ts"))).toBe(false);
    },
  );

  it("enables a disabled feature and scaffolds its route", async () => {
    await nextApp();
    await init(["blog", "--no-sitemap", "--yes"]);
    expect(await exists(join(dir, "app/(voxx)/sitemap.ts"))).toBe(false);

    await add(["sitemap"]);
    expect(process.exitCode).not.toBe(1);
    expect(await exists(join(dir, "app/(voxx)/sitemap.ts"))).toBe(true);
    const cfg = JSON.parse(await readFile(join(dir, "voxx.json"), "utf8"));
    expect(cfg.features.sitemap).toBe(true);
  });

  it("disables a feature and deletes its route files", async () => {
    await nextApp();
    await init(["blog", "--yes"]);
    expect(await exists(join(dir, "app/(voxx)/llms.txt/route.ts"))).toBe(true);

    await remove(["llms", "--force"]);
    expect(process.exitCode).not.toBe(1);
    expect(await exists(join(dir, "app/(voxx)/llms.txt/route.ts"))).toBe(false);
    expect(await exists(join(dir, "app/(voxx)/llms-full.txt/route.ts"))).toBe(
      false,
    );
    const cfg = JSON.parse(await readFile(join(dir, "voxx.json"), "utf8"));
    expect(cfg.features.llmsTxt).toBe(false);
  });

  it("toggles a runtime-only feature without touching files", async () => {
    await writeConfig();
    await remove(["tags", "--force"]);
    expect(process.exitCode).not.toBe(1);
    const cfg = JSON.parse(await readFile(join(dir, "voxx.json"), "utf8"));
    expect(cfg.features.tags).toBe(false);
  });

  it("rejects an unknown feature", async () => {
    await writeConfig();
    await remove(["nonsense"]);
    expect(process.exitCode).toBe(1);
  });
});
