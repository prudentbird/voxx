import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveContentAsset, serveContentAsset } from "../src/assets";
import { DEFAULT_CONFIG as config } from "../src/types";

describe("content asset security", () => {
  async function makeAssetConfig() {
    const dir = await mkdtemp(join(tmpdir(), "voxx-serve-"));
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(dir, "assets"), { recursive: true });
    await writeFile(
      join(dir, "assets", "diagram.png"),
      Buffer.from([0x89, 0x50]),
    );
    await writeFile(
      join(dir, "assets", "post.md"),
      "---\ntitle: Post\ndate: 2026-01-01\n---\n\nBody.\n",
    );
    await writeFile(join(dir, ".env"), "secret");
    const content = { ...config.content, dir };
    return {
      ...config,
      content,
      collections: [{ name: "blog", ...content }],
    };
  }

  it("resolves only visible, non-Markdown files below assets", async () => {
    const cfg = await makeAssetConfig();
    for (const rel of [
      "assets/visible.txt",
      "guides/assets/nested.txt",
      "assets/.secret",
      "assets/.private/key.json",
      ".private/assets/key.json",
      "notes/todo.txt",
      "assets/source.MD",
      "assets/source.MdX",
    ]) {
      await mkdir(join(cfg.content.dir, rel, ".."), { recursive: true });
      await writeFile(join(cfg.content.dir, rel), rel);
      const resolved = await resolveContentAsset(cfg.content.dir, rel);
      if (rel === "assets/visible.txt" || rel === "guides/assets/nested.txt") {
        expect(resolved).not.toBeNull();
      } else {
        expect(resolved).toBeNull();
      }
    }
    for (const rel of [
      "assets",
      "assets/missing.txt",
      "assets/../notes/todo.txt",
      "/assets/visible.txt",
      "assets\\visible.txt",
    ]) {
      expect(await resolveContentAsset(cfg.content.dir, rel)).toBeNull();
    }
  });

  it("rejects hidden symlink targets and permits visible asset targets", async () => {
    const cfg = await makeAssetConfig();
    const { mkdir, symlink } = await import("node:fs/promises");
    await mkdir(join(cfg.content.dir, "assets/.private"));
    await writeFile(
      join(cfg.content.dir, "assets/.private/key.json"),
      "secret",
    );
    await symlink(
      ".private/key.json",
      join(cfg.content.dir, "assets/key.json"),
    );
    await symlink("diagram.png", join(cfg.content.dir, "assets/alias.png"));
    expect(
      await serveContentAsset("/voxx-assets/blog/assets/key.json", {
        config: cfg,
      }),
    ).toBeNull();
    expect(
      await serveContentAsset("/voxx-assets/blog/assets/alias.png", {
        config: cfg,
      }),
    ).not.toBeNull();
  });
});
