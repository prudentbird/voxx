import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { render } from "../src/util";

const ROOT = join(import.meta.dirname, "../../..");
const TEMPLATES = join(ROOT, "packages/cli/templates");
const WEB_APP = join(ROOT, "apps/web/src/app");

// The docs site dogfoods scaffolded output. Every pair here must stay
// byte-identical (after variable substitution) so fixes made in the app
// reach `voxx init` users. layout.tsx is intentionally divergent (the
// template imports ./_voxx/voxx.css while the monorepo app imports
// @voxx/core/theme/voxx.css directly) — see
// plans/002-template-dogfood-sync-guard.md.
const PAIRS: Array<
  [tpl: string, web: string, vars?: Record<string, string>]
> = [
  ["shared/data.ts.tpl", "docs/_voxx/data.ts"],
  ["shared/on-this-page.tsx.tpl", "docs/_voxx/on-this-page.tsx"],
  ["shared/metadata.ts.tpl", "docs/_voxx/metadata.ts"],
  ["docs/sidebar-nav.tsx.tpl", "docs/_voxx/sidebar-nav.tsx"],
  ["docs/doc-page.tsx.tpl", "docs/_voxx/doc-page.tsx"],
  ["docs/page.tsx.tpl", "docs/[[...slug]]/page.tsx"],
  [
    "shared/llms-route.ts.tpl",
    "llms.txt/route.ts",
    { DATA_IMPORT: "../docs/_voxx/data" },
  ],
  [
    "shared/llms-full-route.ts.tpl",
    "llms-full.txt/route.ts",
    { DATA_IMPORT: "../docs/_voxx/data" },
  ],
  ["shared/robots.ts.tpl", "robots.ts", { DATA_IMPORT: "./docs/_voxx/data" }],
  ["shared/sitemap.ts.tpl", "sitemap.ts", { DATA_IMPORT: "./docs/_voxx/data" }],
];

describe("templates stay in sync with the dogfooded app", () => {
  it.each(PAIRS)("%s matches apps/web/src/app/%s", async (tpl, web, vars) => {
    const rendered = render(await readFile(join(TEMPLATES, tpl), "utf8"), vars);
    const actual = await readFile(join(WEB_APP, web), "utf8");
    expect(rendered).toBe(actual);
  });
});
