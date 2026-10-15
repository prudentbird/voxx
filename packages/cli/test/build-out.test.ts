import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, normalize, resolve } from "node:path";
import { build } from "../src/commands/build";
import { exists, log } from "../src/util";

const originalCwd = process.cwd();
let root: string;
let cwd: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "voxx-build-out-"));
  cwd = join(root, "project");
  await mkdir(join(cwd, "content"), { recursive: true });
  await writeFile(
    join(cwd, "voxx.json"),
    JSON.stringify({
      site: { title: "Test", url: "https://test.dev" },
      content: { type: "blog", dir: "content", basePath: "/blog" },
    }),
  );
  await writeFile(
    join(cwd, "content/post.md"),
    "---\ntitle: Hello\ndate: 2026-01-01\n---\nBody.",
  );
  process.chdir(cwd);
  vi.spyOn(log, "success").mockImplementation(() => {});
  vi.spyOn(log, "info").mockImplementation(() => {});
});

afterEach(async () => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

describe("voxx build --out", () => {
  it.each([undefined, "output/site", "./output/../site", "content-preview"])(
    "builds inside the project with a relative success path (%s)",
    async (out) => {
      await build(out === undefined ? [] : ["--out", out]);
      const rel =
        out === undefined ? "dist" : out === "./output/../site" ? "site" : out;
      expect(
        await readFile(join(cwd, rel, "blog/post/index.html"), "utf8"),
      ).toContain("Hello");
      expect(log.success).toHaveBeenCalledWith(
        `Built 1 post → ${normalize(rel)}/`,
      );
      expect(log.info).toHaveBeenCalledWith(
        expect.stringContaining(join(rel, "blog/index.html")),
      );
    },
  );

  it.each(["absolute", "relative"])(
    "builds outside the project with an absolute success path (%s)",
    async (kind) => {
      const outDir = resolve(process.cwd(), "../site");
      await build(["--out", kind === "absolute" ? outDir : "../site"]);
      expect(
        await readFile(join(outDir, "blog/post/index.html"), "utf8"),
      ).toContain("Hello");
      expect(await exists(join(cwd, outDir))).toBe(false);
      expect(log.success).toHaveBeenCalledWith(`Built 1 post → ${outDir}/`);
      expect(log.info).toHaveBeenCalledWith(
        expect.stringContaining(join(outDir, "blog/index.html")),
      );
    },
  );

  it.each([".", "", "dist/..", "absolute"])(
    "refuses output resolving to the project root (%s)",
    async (out) => {
      await expect(
        build(["--out", out === "absolute" ? process.cwd() : out]),
      ).rejects.toThrow(/output directory.*project root/i);
      expect(await exists(join(cwd, "_voxx"))).toBe(false);
      expect((await readdir(cwd)).sort()).toEqual(["content", "voxx.json"]);
    },
  );

  it.each(["content", "content/../content", "content/generated", "absolute"])(
    "refuses output in a content directory before writing (%s)",
    async (out) => {
      await expect(
        build([
          "--out",
          out === "absolute" ? resolve(process.cwd(), "content") : out,
        ]),
      ).rejects.toThrow(/output directory.*content directory/i);
      expect(await readdir(join(cwd, "content"))).toEqual(["post.md"]);
    },
  );

  it("protects every collection, including content outside the project", async () => {
    const external = resolve(process.cwd(), "../docs");
    await writeFile(
      join(cwd, "voxx.json"),
      JSON.stringify({
        site: { title: "Test", url: "https://test.dev" },
        collections: [
          { name: "blog", type: "blog", dir: "content", basePath: "/blog" },
          { name: "docs", type: "docs", dir: external, basePath: "/docs" },
        ],
      }),
    );
    await expect(build(["--out", external])).rejects.toThrow(
      /output directory.*content directory/i,
    );
    expect(await exists(external)).toBe(false);
  });

  it.each([".", "content", "content/generated"])(
    "refuses an output symlink to %s before writing",
    async (target) => {
      await symlink(resolve(cwd, target), join(cwd, "out"), "junction");
      await expect(build(["--out", "out"])).rejects.toThrow(
        /output directory.*(project root|content directory)/i,
      );
      expect(await exists(join(cwd, "_voxx"))).toBe(false);
      expect(await readdir(join(cwd, "content"))).toEqual(["post.md"]);
      expect(await exists(join(cwd, "content/generated"))).toBe(false);
    },
  );

  it("refuses nonexistent output beneath a symlink to content", async () => {
    await symlink(join(cwd, "content"), join(cwd, "out"), "junction");
    await expect(build(["--out", "out/nested/site"])).rejects.toThrow(
      /output directory.*content directory/i,
    );
    expect(await readdir(join(cwd, "content"))).toEqual(["post.md"]);
  });

  it("canonicalizes configured content symlinks too", async () => {
    const source = join(root, "sources");
    await mkdir(source);
    await rm(join(cwd, "content"), { recursive: true });
    await symlink(source, join(cwd, "content"), "junction");
    await expect(build(["--out", join(source, "generated")])).rejects.toThrow(
      /output directory.*content directory/i,
    );
    expect(await readdir(source)).toEqual([]);
  });

  it("allows a symlink to a separate output directory", async () => {
    const target = join(root, "site");
    await mkdir(target);
    await symlink(target, join(cwd, "out"), "junction");
    await build(["--out", "out"]);
    expect(
      await readFile(join(target, "blog/post/index.html"), "utf8"),
    ).toContain("Hello");
  });
});
