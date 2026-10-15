import { describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { init } from "../src/commands/init";
import { buildSite } from "../src/commands/build";

describe("voxx build frontmatter diagnostics", () => {
  it.each([
    ["schema", "title: 404", "Expected string, actual 404"],
    ["YAML", "title: [Unclosed", "unexpected end of the stream"],
  ])("names the file for %s errors", async (_kind, yaml, detail) => {
    const cwd = await mkdtemp(join(tmpdir(), "voxx-cli-frontmatter-"));
    const originalCwd = process.cwd();
    const originalArgv = process.argv;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      process.chdir(cwd);
      process.exitCode = 0;
      await init(["blog", "--static", "--yes"]);
      const file = "content/blog/2026-10-15-404.md";
      await writeFile(join(cwd, file), `---\n${yaml}\n---\nbody`);
      process.argv = [process.execPath, "voxx", "build"];
      vi.resetModules();
      await import("../src/index");
      await vi.waitFor(() => expect(process.exitCode).toBe(1), {
        timeout: 60000,
      });
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining(`${file}: invalid frontmatter — `),
      );
      expect(error).toHaveBeenCalledWith(expect.stringContaining(detail));
    } finally {
      process.chdir(originalCwd);
      process.argv = originalArgv;
      process.exitCode = 0;
      error.mockRestore();
      await rm(cwd, { recursive: true, force: true, maxRetries: 3 });
    }
  });

  it("reports project-relative paths for an external project cwd", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "voxx-cli-frontmatter-ext-"));
    try {
      await writeFile(
        join(projectDir, "voxx.json"),
        JSON.stringify({
          site: {
            title: "Test Site",
            description: "A test site",
            url: "https://test.dev",
          },
          content: { type: "blog", dir: "content", basePath: "/blog" },
        }),
      );
      const file = join("content", "blog", "2026-10-15-404.md");
      await mkdir(join(projectDir, "content", "blog"), { recursive: true });
      await writeFile(join(projectDir, file), "---\ntitle: [Unclosed\n---\nbody");

      await expect(
        buildSite({ cwd: projectDir, outDir: join(projectDir, "dist") }),
      ).rejects.toThrow(`${file}: invalid frontmatter — `);
    } finally {
      await rm(projectDir, { recursive: true, force: true, maxRetries: 3 });
    }
  });
});
