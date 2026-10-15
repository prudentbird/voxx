import { describe, expect, it } from "vitest";
import ts from "typescript";
import * as core from "@prudentbird/voxx-core";
import {
  nextScaffoldOps,
  featureAddOps,
  type ScaffoldContext,
} from "../src/scaffold";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildVoxxJson, defaultCollection } from "../src/collections";
import { recommendedFlags } from "../src/features";
import type { WriteOp } from "../src/util";

// Execute the emitted TypeScript with only framework and data I/O substituted.
function evaluate(
  source: string,
  imports: Record<string, unknown>,
): Record<"default" | "GET" | "getConfig", () => Promise<unknown>> {
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  new Function("require", "exports", js)((name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  }, exports);
  return exports as Record<
    "default" | "GET" | "getConfig",
    () => Promise<unknown>
  >;
}

for (const cacheComponents of [false, true]) {
  describe(`multi-collection routes (cacheComponents=${cacheComponents})`, () => {
    const ctx: ScaffoldContext = {
      cwd: "/project",
      appDir: "app",
      collections: [defaultCollection("blog"), defaultCollection("docs")],
      flags: recommendedFlags(["blog", "docs"]),
      hasTokens: false,
      split: true,
      cacheComponents,
    };
    const collections = ctx.collections.map((c) => ({
      ...core.DEFAULT_CONFIG.content,
      ...c,
    }));
    const config = {
      ...core.DEFAULT_CONFIG,
      site: { ...core.DEFAULT_CONFIG.site, url: "https://example.com" },
      collections,
    };
    const posts = collections.map((c) => ({
      draft: false,
      slug: "hello",
      path: ["hello"],
      url: `${c.basePath}/hello`,
      title: c.name,
      date: "2026-01-01",
      tags: [],
      authors: [],
      excerpt: c.name,
      content: `${c.name} body`,
      html: "<p>hello</p>",
      toc: [],
      readingTimeMinutes: 1,
    }));
    const data = (name: string) => ({
      getConfig: async () => ({
        ...config,
        content: collections.find((c) => c.name === name)!,
      }),
      listPosts: async () => ({
        posts: posts.filter((p) => p.title === name),
        total: 1,
      }),
      getPosts: async () => posts.filter((p) => p.title === name),
    });
    function modules(ops: WriteOp[]) {
      const imports: Record<string, unknown> = {
        "@prudentbird/voxx-core": {
          ...core,
          loadConfig: async () => config,
          listPosts: async ({ collection }: { collection: string }) =>
            data(collection).listPosts(),
          getPosts: async ({ collection }: { collection: string }) =>
            data(collection).getPosts(),
        },
        "server-only": {},
        "next/cache": { cacheLife: () => {} },
        "./_content-version": { CONTENT_VERSION: 0 },
        "./content-version": { CONTENT_VERSION: 0 },
        "./blog/_data": data("blog"),
        "../blog/_data": data("blog"),
      };
      const site = ops.find((op) => op.path.endsWith("/_voxx/data.ts"));
      if (site) {
        const module = evaluate(site.content!, imports);
        imports["./_voxx/data"] = module;
        imports["../_voxx/data"] = module;
      }
      return imports;
    }
    for (const mode of ["init", "add"] as const) {
      it(`${mode} aggregates sitemap and LLM output`, async () => {
        const ops =
          mode === "init"
            ? await nextScaffoldOps(ctx)
            : (
                await Promise.all(
                  (["sitemap", "robots", "llmsTxt"] as const).map((key) =>
                    featureAddOps(ctx, key),
                  ),
                )
              ).flat();
        const imports = modules(ops);
        const route = (suffix: string) =>
          evaluate(
            ops.find((op) => op.path.endsWith(suffix))!.content!,
            imports,
          );
        const sitemap = (await route("/sitemap.ts").default()) as {
          url: string;
        }[];
        expect(sitemap.map((entry) => entry.url)).toEqual(
          expect.arrayContaining([
            "https://example.com/blog",
            "https://example.com/docs",
            "https://example.com/blog/hello",
            "https://example.com/docs/hello",
          ]),
        );
        const llms = await (
          (await route("/llms.txt/route.ts").GET()) as Response
        ).text();
        expect(llms).toContain("## Blog");
        expect(llms).toContain("## Docs");
        expect(llms).toContain("https://example.com/docs/hello");
        const full = await (
          (await route("/llms-full.txt/route.ts").GET()) as Response
        ).text();
        expect(full).toContain("blog body");
        expect(full).toContain("docs body");
        expect(await route("/robots.ts").default()).toMatchObject({
          sitemap: "https://example.com/sitemap.xml",
        });
      });
    }
    it("preserves a custom single collection name through config loading in both data variants", async () => {
      const dir = await mkdtemp(join(tmpdir(), "voxx-custom-name-"));
      try {
        const collection = {
          ...defaultCollection("blog", "posts"),
          dir: "content",
        };
        await mkdir(join(dir, "content"));
        await writeFile(
          join(dir, "voxx.json"),
          JSON.stringify(buildVoxxJson(config.site, [collection])),
        );
        const loaded = await core.loadConfig({ cwd: dir });
        const ops = await nextScaffoldOps({
          ...ctx,
          collections: [collection],
        });
        const imports = modules(ops);
        imports["@prudentbird/voxx-core"] = {
          ...core,
          loadConfig: async () => loaded,
        };
        const scoped = (await evaluate(
          ops.find((op) => op.path.endsWith("/posts/_data.ts"))!.content!,
          imports,
        ).getConfig()) as core.VoxxConfig;
        expect(scoped.content.basePath).toBe("/posts");
        expect(loaded.collections[0]?.name).toBe("posts");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    it.each([false, true])(
      "uses the newest dates across manually ordered posts (empty first=%s)",
      async (emptyFirst) => {
        const ops = await nextScaffoldOps(ctx);
        const docsPosts = [
          posts[1]!,
          { ...posts[1]!, date: "2026-02-01", updated: "2026-06-01" },
        ];
        const module = evaluate(
          ops.find((op) => op.path.endsWith("/sitemap.ts"))!.content!,
          {
            "@prudentbird/voxx-core": core,
            "./_voxx/data": {
              getConfig: async () => config,
              listCollections: async () => [
                {
                  collection: collections[0],
                  posts: emptyFirst ? [] : [posts[0]],
                },
                { collection: collections[1], posts: docsPosts },
              ],
            },
          },
        );
        const entries = (await module.default()) as {
          url: string;
          lastModified?: string;
        }[];
        expect(
          entries.find((entry) => entry.url === config.site.url)?.lastModified,
        ).toBe("2026-06-01");
        expect(
          entries.find((entry) => entry.url.endsWith("/docs"))?.lastModified,
        ).toBe("2026-06-01");
      },
    );

    it("scopes the second collection's config for SEO and feeds", async () => {
      const ops = await nextScaffoldOps(ctx);
      const scoped = (await evaluate(
        ops.find((op) => op.path.endsWith("/docs/_data.ts"))!.content!,
        modules(ops),
      ).getConfig()) as core.VoxxConfig;
      expect(core.buildSeo(posts[1]!, scoped).jsonLd?.["@type"]).toBe(
        "TechArticle",
      );
      expect(core.renderRss([posts[1]!], scoped)).toContain(
        'href="https://example.com/docs/rss.xml" rel="self"',
      );
      expect(core.renderLlmsTxt([posts[1]!], scoped)).toContain("## Pages");
    });
  });
}
