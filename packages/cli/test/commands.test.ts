import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../src/commands/build";
import { newPost } from "../src/commands/new";
import { init } from "../src/commands/init";
import { exists } from "../src/util";

const originalCwd = process.cwd();
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "voxx-cli-"));
  process.chdir(dir);
  process.exitCode = 0;
});

afterEach(() => {
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
      "![d](./diagram.png)",
    );
    await writeFile(join(dir, "content", "diagram.png"), "not-a-real-png");
    await build([]);

    expect(await exists(join(dir, "dist/blog/diagram.png"))).toBe(true);
    const html = await readFile(join(dir, "dist/blog/pics/index.html"), "utf8");
    expect(html).toContain('src="/blog/diagram.png"');
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

    // drafts:true in voxx.json must survive the absence of the CLI flag
    await writeConfig({
      content: { type: "blog", dir: "content", basePath: "/blog", drafts: true },
    });
    await build(["--out", "dist3"]);
    expect(await exists(join(dir, "dist3/blog/wip/index.html"))).toBe(true);
  });

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

    // per-collection feed under its basePath, with a matching self link
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

  it("fails cleanly without voxx.json", async () => {
    await build([]);
    expect(process.exitCode).toBe(1);
  });
});

describe("voxx new", () => {
  it("creates a dated blog post", async () => {
    await writeConfig();
    await newPost(["My First Post", "--date", "2026-06-01"]);
    const file = join(dir, "content", "2026-06-01-my-first-post.md");
    expect(await exists(file)).toBe(true);
    const raw = await readFile(file, "utf8");
    expect(raw).toContain("title: My First Post");
    expect(raw).toContain("slug: my-first-post");
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
    expect(raw).toContain("title: Install Guide");
    // docs frontmatter has no date/tags lines
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
});

describe("voxx init (static, non-TTY)", () => {
  it("writes voxx.json and sample content", async () => {
    await init(["blog"]);
    expect(await exists(join(dir, "voxx.json"))).toBe(true);
    expect(await exists(join(dir, "content/hello-world.md"))).toBe(true);
    const cfg = JSON.parse(await readFile(join(dir, "voxx.json"), "utf8"));
    expect(cfg.content.type).toBe("blog");
  });

  it("scaffolds routes into a Next.js app", async () => {
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "my-app", dependencies: { next: "16.0.0" } }),
    );
    await mkdir(join(dir, "app"), { recursive: true });
    await init(["blog"]);

    expect(await exists(join(dir, "app/blog/page.tsx"))).toBe(true);
    expect(await exists(join(dir, "app/blog/rss.xml/route.ts"))).toBe(true);
    expect(await exists(join(dir, "app/robots.ts"))).toBe(true);
    expect(await exists(join(dir, "app/llms.txt/route.ts"))).toBe(true);
    expect(await exists(join(dir, "app/llms-full.txt/route.ts"))).toBe(true);
    const data = await readFile(join(dir, "app/blog/_voxx/data.ts"), "utf8");
    expect(data).toContain("findPost");
  });
});
