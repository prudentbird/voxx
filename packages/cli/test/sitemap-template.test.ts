import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJiti } from "jiti";
import { render } from "../src/util";

describe("Next sitemap template", () => {
  it.each(["blog", "docs", "changelog"])(
    "keeps %s URLs free of fragments",
    async (type) => {
      const dir = await mkdtemp(join(tmpdir(), "voxx-sitemap-"));
      try {
        const basePath = `/${type}`;
        const posts = [
          {
            path: ["latest"],
            url: `${basePath}${type === "changelog" ? "#" : "/"}latest`,
            date: "2026-02-01",
            updated: "2026-02-03",
          },
          {
            path: ["older"],
            url: `${basePath}${type === "changelog" ? "#" : "/"}older`,
            date: "2026-01-01",
          },
        ];
        await writeFile(
          join(dir, "data.ts"),
          `
          export const getConfig = async () => (${JSON.stringify({ site: { url: "https://test.dev" }, content: { basePath } })});
          export const listPosts = async () => (${JSON.stringify({ posts })});
        `,
        );
        const template = await readFile(
          join(import.meta.dirname, "../templates/shared/sitemap.ts.tpl"),
          "utf8",
        );
        await writeFile(
          join(dir, "sitemap.ts"),
          render(template, { DATA_IMPORT: "./data" }),
        );
        const jiti = createJiti(import.meta.url, {
          alias: {
            "@prudentbird/voxx-core": join(
              import.meta.dirname,
              "../../core/src/util.ts",
            ),
          },
        });
        const sitemap = await jiti.import<
          () => Promise<Array<{ url: string; lastModified?: string }>>
        >(join(dir, "sitemap.ts"), { default: true });
        const entries = await sitemap();
        expect(entries.every((entry) => !entry.url.includes("#"))).toBe(true);
        expect(
          entries.filter(
            (entry) => entry.url === `https://test.dev${basePath}`,
          ),
        ).toEqual([expect.objectContaining({ lastModified: "2026-02-03" })]);
        expect(entries.map((entry) => entry.url)).toEqual([
          "https://test.dev",
          `https://test.dev${basePath}`,
          ...(type === "changelog"
            ? []
            : posts.map((post) => `https://test.dev${post.url}`)),
        ]);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
});
