import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { getPosts } from "../src/index";
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

  it("includes the working-directory-relative path in core API rejections", async () => {
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
      await expect(getPosts({ cwd })).rejects.toThrow(
        `${relative(process.cwd(), join(cwd, file))}: invalid frontmatter — `,
      );
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
