import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dev, serveFile } from "../src/commands/dev";

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

describe("serveFile", () => {
  let outDir: string;

  beforeEach(async () => {
    const parent = await mkdtemp(join(tmpdir(), "voxx-serve-"));
    outDir = join(parent, "out");
    await mkdir(join(outDir, "blog"), { recursive: true });
    await writeFile(join(outDir, "index.html"), "<h1>Home</h1>");
    await writeFile(join(outDir, "blog", "index.html"), "<h1>Blog</h1>");
    await writeFile(join(outDir, "style.css"), "body { color: red; }");
    await writeFile(join(parent, "secret.txt"), "top secret");
  });

  it("serves the root index.html", async () => {
    const res = await serveFile(outDir, "/");
    expect(res.status).toBe(200);
    expect(res.type).toBe("text/html; charset=utf-8");
    expect(res.body.toString()).toBe("<h1>Home</h1>");
  });

  it("resolves directory indexes with and without trailing slash", async () => {
    const slashed = await serveFile(outDir, "/blog/");
    expect(slashed.status).toBe(200);
    expect(slashed.body.toString()).toBe("<h1>Blog</h1>");

    const bare = await serveFile(outDir, "/blog");
    expect(bare.status).toBe(200);
    expect(bare.body.toString()).toBe("<h1>Blog</h1>");
  });

  it("serves assets with the right MIME type", async () => {
    const res = await serveFile(outDir, "/style.css");
    expect(res.status).toBe(200);
    expect(res.type).toBe("text/css; charset=utf-8");
    expect(res.body.toString()).toContain("color: red");
  });

  it("404s unknown paths", async () => {
    const res = await serveFile(outDir, "/nope");
    expect(res.status).toBe(404);
  });

  it("404s path-traversal attempts", async () => {
    const attempts = [
      "/../secret.txt",
      "/%2e%2e/secret.txt",
      "/..%2fsecret.txt",
      "/blog/../../secret.txt",
    ];
    for (const urlPath of attempts) {
      const res = await serveFile(outDir, urlPath);
      expect(res.status, `expected 404 for ${urlPath}`).toBe(404);
      expect(res.body.toString()).not.toContain("top secret");
    }
  });
});

describe("voxx dev", () => {
  const randomPort = () => 4300 + Math.floor(Math.random() * 2000);

  async function startDev() {
    let handle = await dev(["--port", String(randomPort())]);
    if (!handle) {
      process.exitCode = 0;
      handle = await dev(["--port", String(randomPort())]);
    }
    return handle;
  }

  it("serves the built site and 404s unknown paths", async () => {
    await writeConfig();
    await writePost("hello.md", "title: Hello\ndate: 2026-01-01", "Hi there.");
    const handle = await startDev();
    expect(handle).toBeDefined();
    try {
      const page = await fetch(`http://127.0.0.1:${handle!.port}/blog/hello/`);
      expect(page.status).toBe(200);
      expect(await page.text()).toContain("Hi there");
      const missing = await fetch(
        `http://127.0.0.1:${handle!.port}/blog/nope/`,
      );
      expect(missing.status).toBe(404);
    } finally {
      await handle!.close();
    }
  });

  it("serves drafts by default (preview behavior)", async () => {
    await writeConfig();
    await writePost(
      "wip.md",
      "title: WIP\ndate: 2026-01-01\ndraft: true",
      "Still cooking.",
    );
    const handle = await startDev();
    expect(handle).toBeDefined();
    try {
      const page = await fetch(`http://127.0.0.1:${handle!.port}/blog/wip/`);
      expect(page.status).toBe(200);
      expect(await page.text()).toContain("Still cooking");
    } finally {
      await handle!.close();
    }
  });

  it("fails cleanly without voxx.json", async () => {
    const handle = await dev([]);
    expect(handle).toBeUndefined();
    expect(process.exitCode).toBe(1);
  });

  it("rejects an invalid port", async () => {
    await writeConfig();
    const handle = await dev(["--port", "junk"]);
    expect(handle).toBeUndefined();
    expect(process.exitCode).toBe(1);
  });
});
