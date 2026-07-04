import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { render } from "../src/util";

const ROOT = join(import.meta.dirname, "../../..");
const TEMPLATES = join(ROOT, "packages/cli/templates");
const APP = join(ROOT, "examples/next-docs/app");
const BLOG_APP = join(ROOT, "examples/next-blog/app");

const FORCE_STATIC = 'export const dynamic = "force-static";';

const PAIRS: Array<[tpl: string, file: string, vars?: Record<string, string>]> =
  [
    ["shared/voxx-root-layout.tsx.tpl", "(voxx)/layout.tsx"],
    [
      "docs/layout.tsx.tpl",
      "(voxx)/docs/layout.tsx",
      { GLOBALS_IMPORT: 'import "../_voxx/voxx-globals.css";' },
    ],
    [
      "shared/data-cached.ts.tpl",
      "(voxx)/docs/_data.ts",
      { COLLECTION_ARG: '{ collection: "docs" }' },
    ],
    ["shared/content-version.ts.tpl", "(voxx)/docs/_content-version.ts"],
    ["shared/instrumentation.ts.tpl", "../instrumentation.ts"],
    ["shared/on-this-page.tsx.tpl", "(voxx)/docs/_on-this-page.tsx"],
    ["shared/metadata.ts.tpl", "(voxx)/docs/_metadata.ts"],
    ["shared/theme-toggle.tsx.tpl", "(voxx)/docs/_theme-toggle.tsx"],
    ["docs/sidebar-nav.tsx.tpl", "(voxx)/docs/_sidebar-nav.tsx"],
    ["docs/mobile-nav.tsx.tpl", "(voxx)/docs/_mobile-nav.tsx"],
    ["docs/doc-page.tsx.tpl", "(voxx)/docs/_doc-page.tsx"],
    ["docs/page.tsx.tpl", "(voxx)/docs/[[...slug]]/page.tsx"],
    [
      "shared/llms-route.ts.tpl",
      "(voxx)/llms.txt/route.ts",
      { DATA_IMPORT: "../docs/_data" },
    ],
    [
      "shared/llms-full-route.ts.tpl",
      "(voxx)/llms-full.txt/route.ts",
      { DATA_IMPORT: "../docs/_data" },
    ],
    [
      "shared/robots.ts.tpl",
      "(voxx)/robots.ts",
      { DATA_IMPORT: "./docs/_data" },
    ],
    [
      "shared/sitemap.ts.tpl",
      "(voxx)/sitemap.ts",
      { DATA_IMPORT: "./docs/_data" },
    ],
  ];

describe("templates stay in sync with the generated example app", () => {
  it.each(PAIRS)(
    "%s matches examples/next-docs/app/%s",
    async (tpl, file, vars) => {
      const rendered = render(
        await readFile(join(TEMPLATES, tpl), "utf8"),
        vars,
      );
      const actual = await readFile(join(APP, file), "utf8");
      expect(rendered).toBe(actual);
    },
  );
});

const BLOG_PAIRS: Array<
  [tpl: string, file: string, vars?: Record<string, string>]
> = [
  [
    "shared/data-static.ts.tpl",
    "(voxx)/blog/_data.ts",
    { COLLECTION_ARG: '{ collection: "blog" }' },
  ],
  [
    "shared/rss-route.ts.tpl",
    "(voxx)/blog/rss.xml/route.ts",
    { DATA_IMPORT: "../_data", STATIC_EXPORT: FORCE_STATIC },
  ],
  [
    "shared/llms-route.ts.tpl",
    "(voxx)/llms.txt/route.ts",
    { DATA_IMPORT: "../blog/_data", STATIC_EXPORT: FORCE_STATIC },
  ],
  [
    "shared/llms-full-route.ts.tpl",
    "(voxx)/llms-full.txt/route.ts",
    { DATA_IMPORT: "../blog/_data", STATIC_EXPORT: FORCE_STATIC },
  ],
];

describe("static-variant templates stay in sync with next-blog", () => {
  it.each(BLOG_PAIRS)(
    "%s matches examples/next-blog/app/%s",
    async (tpl, file, vars) => {
      const rendered = render(
        await readFile(join(TEMPLATES, tpl), "utf8"),
        vars,
      );
      const actual = await readFile(join(BLOG_APP, file), "utf8");
      expect(rendered).toBe(actual);
    },
  );
});
