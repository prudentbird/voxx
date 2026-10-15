import { afterEach, beforeEach, expect, it } from "vitest";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, parse } from "node:path";
import { build, buildSite } from "../src/commands/build";

let cwd: string;
let outDir: string;
const post = "---\ntitle: Hello\ndate: 2026-01-01\n---\n\nHello.\n";
async function config(extra = {}) {
  await writeFile(
    join(cwd, "voxx.json"),
    JSON.stringify({
      site: { title: "Test", url: "https://test.dev" },
      content: { dir: "content", type: "blog", basePath: "/blog" },
      ...extra,
    }),
  );
}
beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), "voxx-clean-"));
  outDir = join(cwd, "dist");
  await mkdir(join(cwd, "content"));
  await writeFile(join(cwd, "content/hello.md"), post);
  await config();
});
afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

it("removes deleted and renamed pages and assets on rebuild", async () => {
  await writeFile(join(cwd, "content/image.svg"), "image");
  await buildSite({ cwd, outDir });
  await rename(join(cwd, "content/hello.md"), join(cwd, "content/renamed.md"));
  await rm(join(cwd, "content/image.svg"));
  await buildSite({ cwd, outDir });
  await expect(
    readFile(join(outDir, "blog/hello/index.html")),
  ).rejects.toThrow();
  await expect(access(join(outDir, "blog/image.svg"))).rejects.toThrow();
  expect(
    await readFile(join(outDir, "blog/renamed/index.html"), "utf8"),
  ).toContain("Hello");
  await rm(join(cwd, "content/renamed.md"));
  await buildSite({ cwd, outDir });
  await expect(
    readFile(join(outDir, "blog/renamed/index.html")),
  ).rejects.toThrow();
});

it("removes removed collections and disabled feature output", async () => {
  await mkdir(join(cwd, "docs"));
  await writeFile(join(cwd, "docs/page.md"), post);
  await config({
    collections: [
      { name: "blog", dir: "content", type: "blog", basePath: "/blog" },
      { name: "docs", dir: "docs", type: "docs", basePath: "/docs" },
    ],
    features: { rss: true, sitemap: true, llmsTxt: true, robots: true },
  });
  await buildSite({ cwd, outDir });
  for (const path of [
    "docs/page/index.html",
    "blog/rss.xml",
    "sitemap.xml",
    "llms.txt",
    "llms-full.txt",
    "robots.txt",
  ]) {
    expect(await readFile(join(outDir, path), "utf8")).not.toBe("");
  }
  await config({
    features: { rss: false, sitemap: false, llmsTxt: false, robots: false },
  });
  await buildSite({ cwd, outDir });
  for (const path of [
    "docs",
    "blog/rss.xml",
    "sitemap.xml",
    "llms.txt",
    "llms-full.txt",
    "robots.txt",
  ]) {
    await expect(access(join(outDir, path))).rejects.toThrow();
  }
});

it("refuses an unmarked non-empty directory and leaves it untouched", async () => {
  await mkdir(outDir);
  await writeFile(join(outDir, "keep.txt"), "keep");
  await expect(buildSite({ cwd, outDir })).rejects.toThrow(/--force/);
  expect(await readdir(outDir)).toEqual(["keep.txt"]);
});

it("supports explicitly adopting an old output with --force", async () => {
  await mkdir(outDir);
  await writeFile(join(outDir, "stale.html"), "old output");
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    await build(["--force"]);
  } finally {
    process.chdir(previous);
  }
  await expect(access(join(outDir, "stale.html"))).rejects.toThrow();
  expect(await readFile(join(outDir, ".voxx-build"), "utf8")).not.toBe("");
});

it.each([".", "content", "content/generated", "source", "source/nested"])(
  "refuses protected output %s even with force",
  async (path) => {
    await mkdir(join(cwd, "source/nested"), { recursive: true });
    await config({
      content: {
        dir: "source/nested/content",
        type: "blog",
        basePath: "/blog",
      },
      collections: [
        { name: "blog", dir: "content", type: "blog", basePath: "/blog" },
        {
          name: "docs",
          dir: "source/nested/content",
          type: "docs",
          basePath: "/docs",
        },
      ],
    });
    await expect(
      buildSite({ cwd, outDir: join(cwd, path), force: true }),
    ).rejects.toThrow(/Refusing/);
    expect(await readFile(join(cwd, "content/hello.md"), "utf8")).toBe(post);
  },
);

it.each(["voxx.json", "package.json", "nested/package.json"])(
  "refuses output containing %s even with force",
  async (path) => {
    await mkdir(join(outDir, "nested"), { recursive: true });
    await writeFile(join(outDir, path), "{}");
    await expect(buildSite({ cwd, outDir, force: true })).rejects.toThrow(
      /Refusing/,
    );
    expect(await readFile(join(outDir, path), "utf8")).toBe("{}");
  },
);

it("refuses root and home even with force", async () => {
  for (const path of [parse(cwd).root, homedir()]) {
    await expect(buildSite({ cwd, outDir: path, force: true })).rejects.toThrow(
      /Refusing/,
    );
  }
});

it("refuses aliases to protected content", async () => {
  await symlink(join(cwd, "content"), outDir, "dir");
  await expect(buildSite({ cwd, outDir, force: true })).rejects.toThrow(
    /Refusing/,
  );
  expect(await readFile(join(cwd, "content/hello.md"), "utf8")).toBe(post);
});

it("keeps the previous build and cleans staging directories if generation fails", async () => {
  await buildSite({ cwd, outDir });
  const original = await readFile(
    join(outDir, "blog/hello/index.html"),
    "utf8",
  );
  await writeFile(join(cwd, "content/hello.md"), "---\ntitle: [invalid\n---\n");
  await expect(buildSite({ cwd, outDir })).rejects.toThrow();
  expect(await readFile(join(outDir, "blog/hello/index.html"), "utf8")).toBe(
    original,
  );
  expect((await readdir(cwd)).sort()).toEqual(["content", "dist", "voxx.json"]);
});
