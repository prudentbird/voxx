import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../src/commands/build";
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

describe("static content asset security", () => {
  it.each([
    ".private/key.json",
    "notes/todo.txt",
    "assets/.secret",
    "assets/.private/key.json",
    ".private/assets/key.json",
    "assets/source.MD",
    "assets/source.MdX",
  ])("does not publish %s", async (rel) => {
    await writeConfig();
    await mkdir(join(dir, "content"), { recursive: true });
    await mkdir(join(dir, "content", rel, ".."), { recursive: true });
    await writeFile(join(dir, "content", rel), "private data");
    await build([]);
    expect(await exists(join(dir, "dist/blog", rel))).toBe(false);
  });

  it("copies only symlinks resolving to visible assets inside the collection", async () => {
    await writeConfig();
    await mkdir(join(dir, "content"), { recursive: true });
    for (const rel of [
      "assets/ok.txt",
      "guides/assets/nested.txt",
      "assets/.hidden/key.txt",
      "notes/todo.txt",
      "assets/source.MDX",
    ]) {
      await mkdir(join(dir, "content", rel, ".."), { recursive: true });
      await writeFile(join(dir, "content", rel), rel);
    }
    await mkdir(join(dir, "outside/assets"), { recursive: true });
    await writeFile(join(dir, "outside/assets/key.txt"), "secret");
    const links = {
      "good.txt": join(dir, "content/assets/ok.txt"),
      "hidden.txt": join(dir, "content/assets/.hidden/key.txt"),
      "notes.txt": join(dir, "content/notes/todo.txt"),
      "source.txt": join(dir, "content/assets/source.MDX"),
      "outside.txt": join(dir, "outside/assets/key.txt"),
      external: join(dir, "outside/assets"),
      alias: join(dir, "content/guides/assets"),
      cycle: join(dir, "content/assets"),
      "broken.txt": join(dir, "missing"),
    };
    for (const [name, target] of Object.entries(links)) {
      await symlink(target, join(dir, "content/assets", name));
    }
    await build([]);
    expect(await readFile(join(dir, "dist/blog/assets/good.txt"), "utf8")).toBe(
      "assets/ok.txt",
    );
    expect(
      await readFile(join(dir, "dist/blog/assets/alias/nested.txt"), "utf8"),
    ).toBe("guides/assets/nested.txt");
    for (const name of [
      "hidden.txt",
      "notes.txt",
      "source.txt",
      "outside.txt",
      "external",
      "cycle",
      "broken.txt",
    ]) {
      expect(await exists(join(dir, "dist/blog/assets", name))).toBe(false);
    }
  });
});
