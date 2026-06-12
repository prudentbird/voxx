import { Effect } from "effect";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";
import type { Root } from "hast";
import { RenderError } from "./errors";
import type { TocItem, VoxxConfig } from "./types";

export interface RenderResult {
  html: string;
  toc: TocItem[];
}

export interface RenderOptions {
  /**
   * URL path of the directory the markdown file lives in (e.g. "/docs/01-guides").
   * Relative asset references like `./diagram.png` are resolved against it.
   */
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

function shikiOptions(codeTheme: string) {
  const parts = codeTheme.split(/[,\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      themes: { light: parts[0]!, dark: parts[1]! },
      defaultColor: false as const,
    };
  }
  return { theme: parts[0] ?? "github-dark" };
}

export const renderMarkdownEffect = (
  markdown: string,
  config: VoxxConfig,
  opts: RenderOptions = {},
) =>
  Effect.tryPromise({
    try: async (): Promise<RenderResult> => {
      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeRaw)
        .use(rehypeSlug)
        .use(rehypeAutolinkHeadings, { behavior: "wrap" })
        .use(rehypeShiki, shikiOptions(config.theme.codeTheme));
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
