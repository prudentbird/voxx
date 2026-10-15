import { afterEach, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const callbacks = vi.hoisted(() => new Map<string, () => void>());
vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs")>()),
  watch: vi.fn((path: string, _options: unknown, callback: () => void) => {
    callbacks.set(path, callback);
    return { close() {} };
  }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  callbacks.clear();
  vi.resetModules();
});

it("discovers version modules added after startup and watches newly configured collections", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const dir = await mkdtemp(join(tmpdir(), "voxx-watcher-"));
  const blog = join(dir, "content/blog");
  const docs = join(dir, "content/docs");
  const configPath = join(dir, "voxx.json");
  const site = { title: "Watcher test", url: "https://example.com" };
  const version = join(dir, "app/(voxx)/_voxx/content-version.ts");
  try {
    await mkdir(blog, { recursive: true });
    await writeFile(
      configPath,
      JSON.stringify({ site, content: { dir: "content/blog" } }),
    );
    const { registerContentWatcher } = await import("../src/dev");
    await registerContentWatcher({ cwd: dir, debounceMs: 1 });
    expect(callbacks.has(blog)).toBe(true);
    await mkdir(join(version, ".."), { recursive: true });
    await writeFile(version, "export const CONTENT_VERSION = 0;\n");
    callbacks.get(blog)!();
    await vi.waitFor(async () =>
      expect(await readFile(version, "utf8")).not.toContain("= 0;"),
    );

    await mkdir(docs, { recursive: true });
    await writeFile(
      configPath,
      JSON.stringify({
        site,
        collections: [
          { name: "blog", dir: "content/blog" },
          { name: "docs", type: "docs", dir: "content/docs" },
        ],
      }),
    );
    callbacks.get(configPath)!();
    await vi.waitFor(() => expect(callbacks.has(docs)).toBe(true));
    await writeFile(version, "export const CONTENT_VERSION = 0;\n");
    callbacks.get(docs)!();
    await vi.waitFor(async () =>
      expect(await readFile(version, "utf8")).not.toContain("= 0;"),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it("watches the nearest existing ancestor and retries discovery once a missing collection dir is created", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const dir = await mkdtemp(join(tmpdir(), "voxx-watcher-missing-"));
  const content = join(dir, "content");
  const blog = join(content, "blog");
  const configPath = join(dir, "voxx.json");
  const site = { title: "Watcher test", url: "https://example.com" };
  const version = join(dir, "app/(voxx)/_voxx/content-version.ts");
  try {
    await mkdir(content, { recursive: true });
    await writeFile(
      configPath,
      JSON.stringify({ site, content: { dir: "content/blog" } }),
    );
    const { registerContentWatcher } = await import("../src/dev");
    await registerContentWatcher({ cwd: dir, debounceMs: 1 });
    expect(callbacks.has(blog)).toBe(false);
    expect(callbacks.has(content)).toBe(true);

    await mkdir(join(version, ".."), { recursive: true });
    await writeFile(version, "export const CONTENT_VERSION = 0;\n");
    await mkdir(blog, { recursive: true });
    callbacks.get(content)!();
    await vi.waitFor(() => expect(callbacks.has(blog)).toBe(true));
    await writeFile(version, "export const CONTENT_VERSION = 0;\n");
    callbacks.get(blog)!();
    await vi.waitFor(async () =>
      expect(await readFile(version, "utf8")).not.toContain("= 0;"),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
