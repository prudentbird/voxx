import { Effect } from "effect";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import {
  createHighlighter,
  bundledLanguages,
  type BundledLanguage,
  type Highlighter,
} from "shiki";
import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";
import type { Root } from "hast";
import { RenderError } from "./errors";
import type { TocItem, VoxxConfig } from "./types";

/** Result returned by the Markdown renderer. */
export interface RenderResult {
  /** Rendered HTML string. */
  html: string;
  /** Extracted `h2`/`h3` headings for the table of contents. */
  toc: TocItem[];
}

/** Options passed to the Markdown renderer. */
export interface RenderOptions {
  /** URL prefix used to resolve relative `src` and `poster` attributes. */
  assetBase?: string;
}

function rehypeCollectToc() {
  return (tree: Root, file: { data: Record<string, unknown> }) => {
    const toc: TocItem[] = [];
    visit(tree, "element", (node) => {
      if (node.tagName !== "h2" && node.tagName !== "h3") return;
      const id = node.properties?.["id"];
      if (typeof id !== "string") return;
      toc.push({
        id,
        text: toString(node),
        depth: node.tagName === "h2" ? 2 : 3,
      });
    });
    file.data["toc"] = toc;
  };
}

const EXTERNAL_RE = /^https?:\/\//i;
const ABSOLUTE_RE = /^(?:[a-z][a-z0-9+.-]*:|\/|#|\?)/i;
const ASSET_PROPS = ["src", "poster"] as const;

function resolveRelativePath(base: string, rel: string): string {
  const segments = [...base.split("/"), ...rel.split("/")].filter(
    (s) => s !== "" && s !== ".",
  );
  const out: string[] = [];
  for (const segment of segments) {
    if (segment === "..") out.pop();
    else out.push(segment);
  }
  return `/${out.join("/")}`;
}

function rehypeExternalLinks() {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "a") return;
      const href = node.properties?.["href"];
      if (typeof href !== "string" || !EXTERNAL_RE.test(href)) return;
      node.properties["target"] = "_blank";
      node.properties["rel"] = "noreferrer";
    });
  };
}

function rehypeResolveAssets(base: string) {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      for (const prop of ASSET_PROPS) {
        const value = node.properties?.[prop];
        if (typeof value !== "string" || value === "") continue;
        if (ABSOLUTE_RE.test(value)) continue;
        node.properties[prop] = resolveRelativePath(base, value);
      }
    });
  };
}

type ShikiOptions =
  | { themes: { light: string; dark: string }; defaultColor: false }
  | { theme: string };

function shikiOptions(codeTheme: string): ShikiOptions {
  const parts = codeTheme.split(/[,\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      themes: { light: parts[0]!, dark: parts[1]! },
      defaultColor: false as const,
    };
  }
  return { theme: parts[0] ?? "github-dark" };
}

const BASE_LANGS: BundledLanguage[] = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "bash",
  "css",
  "html",
  "md",
  "python",
  "go",
  "rust",
];

const highlighters = new Map<string, Promise<Highlighter>>();

function getHighlighter(codeTheme: string): Promise<Highlighter> {
  let cached = highlighters.get(codeTheme);
  if (!cached) {
    const opts = shikiOptions(codeTheme);
    const themes =
      "themes" in opts
        ? [opts.themes.light, opts.themes.dark]
        : [(opts as { theme: string }).theme];
    cached = createHighlighter({ themes, langs: BASE_LANGS });
    highlighters.set(codeTheme, cached);
  }
  return cached;
}

const FENCE_LANG_RE = /^[ \t]*(?:`{3,}|~{3,})[ \t]*([A-Za-z0-9_+-]+)/gm;

async function ensureLanguages(
  highlighter: Highlighter,
  markdown: string,
): Promise<void> {
  const loaded = new Set(highlighter.getLoadedLanguages());
  const wanted = new Set<BundledLanguage>();
  for (const match of markdown.matchAll(FENCE_LANG_RE)) {
    const lang = match[1]!.toLowerCase();
    if (!loaded.has(lang) && lang in bundledLanguages) {
      wanted.add(lang as BundledLanguage);
    }
  }
  for (const lang of wanted) {
    try {
      await highlighter.loadLanguage(lang);
    } catch {}
  }
}

/**
 * Converts Markdown to HTML with syntax highlighting, heading slugs,
 * autolinked headings, and a collected table of contents.
 *
 * @param markdown - Raw Markdown source.
 * @param config - Voxx config (used for `theme.codeTheme`).
 * @param opts - Optional `assetBase` for resolving relative image paths.
 */
export const renderMarkdownEffect = (
  markdown: string,
  config: VoxxConfig,
  opts: RenderOptions = {},
) =>
  Effect.tryPromise({
    try: async (): Promise<RenderResult> => {
      const highlighter = await getHighlighter(config.theme.codeTheme);
      await ensureLanguages(highlighter, markdown);
      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeRaw)
        .use(rehypeSlug)
        .use(rehypeAutolinkHeadings, { behavior: "wrap" })
        .use(rehypeExternalLinks)
        .use(
          rehypeShikiFromHighlighter,
          highlighter,
          shikiOptions(config.theme.codeTheme),
        );
      if (opts.assetBase) processor.use(rehypeResolveAssets, opts.assetBase);
      const file = await processor
        .use(rehypeCollectToc)
        .use(rehypeStringify)
        .process(markdown);
      return {
        html: String(file),
        toc: (file.data["toc"] as TocItem[] | undefined) ?? [],
      };
    },
    catch: (cause) =>
      new RenderError({
        message: `Failed to render markdown: ${String(cause)}`,
        cause,
      }),
  });
