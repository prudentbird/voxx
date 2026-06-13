import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "node-html-parser";
import { build } from "../src/commands/build";

const originalCwd = process.cwd();
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "voxx-struct-"));
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

async function writeFileAt(rel: string, contents: string) {
  const target = join(dir, "content", rel);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, contents);
}

async function readDom(rel: string) {
  return parse(await readFile(join(dir, rel), "utf8"));
}

describe("blog build output structure", () => {
  it("emits a well-formed article head and post list", async () => {
    await writeConfig();
    await writeFileAt(
      "first.md",
      "---\ntitle: First Post\ndate: 2026-01-01\n---\n\nBody one.\n",
    );
    await writeFileAt(
      "second.md",
      "---\ntitle: Second Post\ndate: 2026-02-01\n---\n\nBody two.\n",
    );
    await build([]);

    const post = await readDom("dist/blog/first/index.html");
    const h1s = post.querySelectorAll("article.voxx-article h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0]!.text.trim()).toBe("First Post");

    const canonical = post.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute("href")).toMatch(/\/blog\/first$/);

    const ogTitle = post.querySelector('meta[property="og:title"]');
    expect(ogTitle?.getAttribute("content")).toBe("First Post");

    const ld = post.querySelector('script[type="application/ld+json"]');
    expect(ld).not.toBeNull();
    const data = JSON.parse(ld!.text);
    expect(data.headline).toBe("First Post");

    const index = await readDom("dist/blog/index.html");
    expect(index.querySelectorAll(".voxx-postcard")).toHaveLength(2);
  });
});

describe("docs build output structure", () => {
  async function buildDocs() {
    await writeConfig({
      content: { type: "docs", dir: "content", basePath: "/docs" },
    });
    await writeFileAt("index.md", "---\ntitle: Welcome\n---\n\nIntro.\n");
    await writeFileAt(
      "01-getting-started/01-install.md",
      "---\ntitle: Install\n---\n\nInstall it.\n",
    );
    await writeFileAt(
      "01-getting-started/02-usage.md",
      "---\ntitle: Usage\n---\n\n## One\n\ntext\n\n## Two\n\nmore\n",
    );
    await writeFileAt(
      "01-getting-started/03-deploy.md",
      "---\ntitle: Deploy\n---\n\nShip it.\n",
    );
    await build([]);
  }

  it("renders a single sidebar nav link per page with one active", async () => {
    await buildDocs();
    const page = await readDom("dist/docs/getting-started/usage/index.html");
    const navs = page.querySelectorAll("nav.voxx-nav");
    const nav = navs[navs.length - 1]!;
    const links = nav.querySelectorAll(".voxx-nav__link");
    expect(links).toHaveLength(4);
    const active = links.filter(
      (l) => l.getAttribute("data-active") === "true",
    );
    expect(active).toHaveLength(1);
    expect(active[0]!.text.trim()).toBe("Usage");
  });

  it("renders a full pager on a middle page and a degraded one at the ends", async () => {
    await buildDocs();
    const middle = await readDom("dist/docs/getting-started/usage/index.html");
    const mPager = middle.querySelector("nav.voxx-pager")!;
    expect(mPager.querySelectorAll(".voxx-pager__link")).toHaveLength(2);

    const first = await readDom("dist/docs/index.html");
    const fPager = first.querySelector("nav.voxx-pager")!;
    expect(fPager.querySelectorAll(".voxx-pager__link")).toHaveLength(1);
    expect(fPager.querySelectorAll("span")).not.toHaveLength(0);
  });

  it("renders one TOC item per heading", async () => {
    await buildDocs();
    const page = await readDom("dist/docs/getting-started/usage/index.html");
    expect(
      page.querySelectorAll(".voxx-toc__list .voxx-toc__item"),
    ).toHaveLength(2);
  });
});

describe("changelog build output structure", () => {
  it("renders one release section per entry with an id", async () => {
    await writeConfig({
      content: { type: "changelog", dir: "content", basePath: "/changelog" },
    });
    await writeFileAt(
      "1.0.0.md",
      "---\ntitle: v1.0.0\ndate: 2026-01-01\n---\n\nFirst.\n",
    );
    await writeFileAt(
      "1.1.0.md",
      "---\ntitle: v1.1.0\ndate: 2026-02-01\n---\n\nSecond.\n",
    );
    await build([]);

    const page = await readDom("dist/changelog/index.html");
    const releases = page.querySelectorAll("section.voxx-release");
    expect(releases).toHaveLength(2);
    for (const r of releases) {
      expect(r.getAttribute("id")).toBeTruthy();
      expect(r.querySelector(".voxx-release__version")?.text.trim()).toBeTruthy();
    }
  });
});
