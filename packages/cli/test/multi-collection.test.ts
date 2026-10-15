import { describe, expect, it } from "vitest";
import ts from "typescript";
import * as core from "@prudentbird/voxx-core";
import {
  nextScaffoldOps,
  featureAddOps,
  type ScaffoldContext,
} from "../src/scaffold";
import { defaultCollection } from "../src/collections";
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
