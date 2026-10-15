import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPost, getPosts, listPosts } from "../src/index";
import { getPostsEffect } from "../src/content";
import { DEFAULT_CONFIG } from "../src/types";
import { parseFrontmatter } from "../src/frontmatter";

const file = "content/blog/2026-10-15-404.md";
const cases = [
  ["schema", "title: 404", "Expected string, actual 404"],
  ["YAML", "title: [Unclosed", "unexpected end of the stream"],
] as const;

describe.each(cases)("%s frontmatter errors", (_kind, yaml, detail) => {
  const raw = `---\n${yaml}\n---\nbody`;

  it("includes the file and diagnostic in the typed error", async () => {
    const error = await Effect.runPromise(
      Effect.flip(parseFrontmatter(file, raw)),
    );
    expect(error._tag).toBe("InvalidFrontmatter");
    expect(error.file).toBe(file);
    expect(error.message).toContain(`${file}: invalid frontmatter — `);
    expect(error.message).toContain(detail);
    expect(error.cause).toBeDefined();
  });

  it("preserves the file and diagnostic in FiberFailure.message", async () => {
    await expect(
      Effect.runPromise(parseFrontmatter(file, raw)),
    ).rejects.toThrow(`${file}: invalid frontmatter — `);
  });

  it("includes the supplied-project-relative path in core API rejections", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "voxx-frontmatter-"));
    try {
      await mkdir(join(cwd, "content/blog"), { recursive: true });
      await writeFile(join(cwd, file), raw);
      await writeFile(
        join(cwd, "voxx.json"),
        JSON.stringify({
          site: { title: "Test", url: "https://example.com" },
          content: { type: "blog", dir: "content/blog", basePath: "/blog" },
        }),
      );
      for (const read of [
        () => getPosts({ cwd }),
        () => listPosts({ cwd }),
        () => getPost("404", { cwd }),
      ]) {
        await expect(read()).rejects.toMatchObject({
          message: expect.stringMatching(
            /^content\/blog\/2026-10-15-404\.md: invalid frontmatter — /,
          ),
        });
      }
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("keeps the supplied project root when a file becomes invalid in the rendering pass", async () => {
    const cwd = join(tmpdir(), "voxx-external-project");
    const config = {
      ...DEFAULT_CONFIG,
      content: { ...DEFAULT_CONFIG.content, dir: join(cwd, "content/blog") },
    };
    let reads = 0;
    const fs = FileSystem.makeNoop({
      exists: () => Effect.succeed(true),
      readDirectory: () => Effect.succeed(["2026-10-15-404.md"]),
      readFileString: () =>
        Effect.succeed(++reads === 1 ? "---\ntitle: Valid\n---\nbody" : raw),
    });
    await expect(
      Effect.runPromise(
        getPostsEffect(config, { cwd }).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
          Effect.provide(NodeContext.layer),
        ),
      ),
    ).rejects.toMatchObject({
      message: expect.stringMatching(
        /^content\/blog\/2026-10-15-404\.md: invalid frontmatter — /,
      ),
    });
    expect(reads).toBe(2);
  });
});
