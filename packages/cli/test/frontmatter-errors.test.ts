import { describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { init } from "../src/commands/init";

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
});
