import type { Nodes, PhrasingContent } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { VoxxAuthor } from "./types";

type AuthorEntryInput =
  | string
  | { readonly name: string; readonly url?: string };
type AuthorInput =
  | AuthorEntryInput
  | ReadonlyArray<AuthorEntryInput>
  | null
  | undefined;

/**
 * Normalizes the frontmatter `author` field into a `VoxxAuthor[]`.
 *
 * Accepts a scalar name, an object, or an array of either. String entries
 * become `{ name }`; objects pass through. Returns an empty array when unset.
 */
export function normalizeAuthors(input: AuthorInput): VoxxAuthor[] {
  if (input == null) return [];
  const entries: ReadonlyArray<AuthorEntryInput> = Array.isArray(input)
    ? input
    : [input as AuthorEntryInput];
  return entries.map((entry) =>
    typeof entry === "string"
      ? { name: entry }
      : entry.url !== undefined
        ? { name: entry.name, url: entry.url }
        : { name: entry.name },
  );
}

/**
 * Converts a string to a URL-safe slug.
 *
 * Normalizes Unicode, lowercases, trims, and replaces characters other than
 * letters, numbers, and marks with hyphens.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

const DATE_PREFIX_RE = /^(\d{4})-(\d{2})-(\d{2})[-_.](.+)$/;

/**
 * Strips a `YYYY-MM-DD` prefix from a filename stem.
 *
 * @param name - Filename stem without extension.
 * @returns The extracted ISO date and the remaining name, or just `rest` if no prefix found.
 */
export function splitDatePrefix(name: string): { date?: string; rest: string } {
  const m = DATE_PREFIX_RE.exec(name);
  if (!m) return { rest: name };
  return { date: `${m[1]}-${m[2]}-${m[3]}`, rest: m[4]! };
}

const ORDER_PREFIX_RE = /^(\d{1,4})[-_.](.+)$/;

/**
 * Strips a numeric order prefix (up to 4 digits) from a filename or directory stem.
 *
 * @param name - Filename stem without extension, e.g. `"01-getting-started"`.
 * @returns The extracted order number and the remaining name.
 */
export function splitOrderPrefix(name: string): {
  order?: number;
  rest: string;
} {
  const m = ORDER_PREFIX_RE.exec(name);
  if (!m) return { rest: name };
  return { order: Number(m[1]), rest: m[2]! };
}

/**
 * Converts a slug or filename stem to a human-readable title.
 *
 * @param segment - Slug segment, e.g. `"getting-started"`.
 * @returns Title-cased string, e.g. `"Getting Started"`.
 */
export function humanize(segment: string): string {
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .trim();
}

/**
 * Joins a base path and a slug into a clean URL path.
 *
 * Ensures exactly one leading slash and removes duplicate slashes.
 */
export function joinPath(base: string, slug: string): string {
  const left = base.replace(/\/+$/, "");
  const right = slug.replace(/^\/+/, "");
  const prefix = left.startsWith("/") ? left : `/${left}`;
  return `${prefix}/${right}`.replace(/([^:])\/{2,}/g, "$1/");
}

/**
 * Matches a value that already stands on its own: a URI scheme (`https:`,
 * `mailto:`, …), a root-relative path (`/…`), a fragment (`#…`), or a query
 * (`?…`). Anything else is a bare relative reference that needs resolving
 * against the referencing file's directory.
 */
export const ABSOLUTE_RE = /^(?:[a-z][a-z0-9+.-]*:|\/|#|\?)/i;

/**
 * Resolves a relative asset reference against a base URL path, collapsing
 * `../` escapes the way a browser would. Used for both inline Markdown asset
 * references (`src`/`poster`/asset anchor `href`) and relative `image:` frontmatter.
 *
 * @param base - Base URL path the reference is relative to, e.g. `/blog/my-post`.
 * @param rel - Relative reference, e.g. `./assets/cover.png`.
 */
export function resolveRelativePath(base: string, rel: string): string {
  const suffixStart = rel.search(/[?#]/);
  const relPath = suffixStart < 0 ? rel : rel.slice(0, suffixStart);
  const suffix = suffixStart < 0 ? "" : rel.slice(suffixStart);
  const segments = [...base.split("/"), ...relPath.split("/")].filter(
    (s) => s !== "" && s !== ".",
  );
  const out: string[] = [];
  for (const segment of segments) {
    if (segment === "..") out.pop();
    else out.push(segment);
  }
  return `/${out.join("/")}${suffix}`;
}

/**
 * Resolves a site-relative path to a full absolute URL.
 *
 * Returns the path unchanged if it already starts with `http(s)://`.
 *
 * @param siteUrl - Canonical site origin, e.g. `https://example.com`.
 * @param path - Absolute or relative URL path.
 */
export function absoluteUrl(siteUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const origin = siteUrl.replace(/\/+$/, "");
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${rel}`;
}

/**
 * Estimates reading time in minutes, assuming 200 words per minute.
 * Always returns at least 1.
 */
export function readingTimeMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Reuse the processor; parsing needs no rendering, highlighting, or async plugins.
const excerptParser = unified().use(remarkParse).use(remarkGfm).freeze();

// Retain source/excerpt strings, never ASTs. Bound both the number of posts and
// source/output characters (roughly 16 MiB of UTF-16 text plus Map overhead).
const EXCERPT_CACHE_ENTRIES = 1024;
const EXCERPT_CACHE_CHARACTERS = 8 * 1024 * 1024;
const excerptCache = new Map<string, { max: number; excerpt: string }>();
let excerptCacheCharacters = 0;

function cacheExcerpt(markdown: string, max: number, excerpt: string): string {
  const previous = excerptCache.get(markdown);
  if (previous) {
    excerptCacheCharacters -= markdown.length + previous.excerpt.length;
    excerptCache.delete(markdown);
  }
  const characters = markdown.length + excerpt.length;
  if (characters > EXCERPT_CACHE_CHARACTERS) return excerpt;
  while (
    excerptCache.size >= EXCERPT_CACHE_ENTRIES ||
    excerptCacheCharacters + characters > EXCERPT_CACHE_CHARACTERS
  ) {
    const oldest = excerptCache.entries().next().value;
    if (!oldest) break;
    excerptCacheCharacters -= oldest[0].length + oldest[1].excerpt.length;
    excerptCache.delete(oldest[0]);
  }
  excerptCache.set(markdown, { max, excerpt });
  excerptCacheCharacters += characters;
  return excerpt;
}

function excerptChildren(children: PhrasingContent[]): PhrasingContent[] {
  return children.flatMap((node): PhrasingContent[] => {
    switch (node.type) {
      case "html":
        // The Markdown parser has already recognized a valid HTML token.
        // Match only the tag name; quoted attributes can contain `>`.
        return /^<br(?=[\s/>])/i.test(node.value)
          ? [{ type: "text", value: " " }]
          : [];
      case "inlineCode":
      case "image":
      case "imageReference":
      case "footnoteReference":
        return [];
      case "break":
        return [{ type: "text", value: " " }];
      default:
        return [
          "children" in node
            ? { ...node, children: excerptChildren(node.children) }
            : node,
        ];
    }
  });
}

/**
 * Extracts plain text from the first Markdown paragraphs, omitting code,
 * HTML, headings, images, tables, and link/footnote definitions. Inline HTML
 * line breaks become spaces. A bounded cache avoids reparsing unchanged sources.
 *
 * @param markdown - Raw Markdown source.
 * @param max - Maximum character length before truncation. Defaults to `180`.
 */
export function deriveExcerpt(markdown: string, max = 180): string {
  const cached = excerptCache.get(markdown);
  if (cached && cached.max === max) {
    excerptCache.delete(markdown);
    excerptCache.set(markdown, cached);
    return cached.excerpt;
  }
  const tree = excerptParser.parse(markdown);
  let text = "";
  function collect(node: Nodes): void {
    if (text.length > max) return;
    switch (node.type) {
      case "code":
      case "html":
      case "definition":
      case "footnoteDefinition":
      case "heading":
      case "table":
        return;
      case "paragraph": {
        const paragraph = toString({
          ...node,
          children: excerptChildren(node.children),
        })
          .replace(/\s+/g, " ")
          .trim();
        if (paragraph) text += `${text ? " " : ""}${paragraph}`;
        return;
      }
      default:
        if ("children" in node) {
          for (const child of node.children) {
            collect(child);
            if (text.length > max) break;
          }
        }
    }
  }
  collect(tree);
  if (text.length <= max) return cacheExcerpt(markdown, max, text);
  const prefix = text.slice(0, max);
  const excerpt = `${/\s/.test(text.charAt(max)) ? prefix.trimEnd() : prefix.replace(/\s+\S*$/, "")}…`;
  return cacheExcerpt(markdown, max, excerpt);
}

/**
 * Formats an ISO 8601 date string for display in UTC.
 * Datetimes without an explicit timezone are interpreted as UTC.
 *
 * @param iso - ISO date string, e.g. `"2024-01-15"`.
 * @param locale - BCP 47 locale. Defaults to `"en-US"`.
 * @returns Formatted string like `"January 15, 2024"`, or the original string if invalid.
 */
export function formatDate(iso: string, locale = "en-US"): string {
  const withoutTimeZone =
    /^(?:\d{4}|[+-]\d{6})-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/i;
  const d = new Date(withoutTimeZone.test(iso) ? `${iso}Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const VERSION_RE = /^v?(\d+(?:\.\d+)*(?:[-.][\w.]+)?)$/i;

/**
 * Parses a semver string from a filename stem, stripping any leading `v`.
 *
 * @param name - Filename stem, e.g. `"v1.2.3"` or `"1.0.0-rc.1"`.
 * @returns Normalized version string, or `undefined` if not a valid version.
 */
export function parseVersion(name: string): string | undefined {
  const m = VERSION_RE.exec(name);
  return m ? m[1] : undefined;
}

/**
 * Compares two semver-like version strings numerically.
 *
 * @returns Negative if `a < b`, positive if `a > b`, zero if equal.
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split(/[-.]/);
  const partsB = b.split(/[-.]/);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const ai = partsA[i] ?? "";
    const bi = partsB[i] ?? "";
    const na = Number(ai);
    const nb = Number(bi);
    const bothNumeric = !Number.isNaN(na) && !Number.isNaN(nb);
    if (bothNumeric) {
      if (na !== nb) return na - nb;
    } else if (ai !== bi) {
      if (ai === "") return 1;
      if (bi === "") return -1;
      return ai < bi ? -1 : 1;
    }
  }
  return 0;
}

/**
 * Escapes a string for safe inclusion in XML/HTML attribute values and text nodes.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Serializes an object as a JSON string safe for inline `<script>` tags.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Formats an ISO 8601 date string as RFC 822 (used in RSS feeds). */
export function rfc822(date: string): string {
  const d = new Date(date);
  return (isNaN(d.getTime()) ? new Date() : d).toUTCString();
}

/** Formats an ISO 8601 date string as `YYYY-MM-DD` (used in sitemaps). */
export function isoDate(date: string): string {
  const d = new Date(date);
  return (isNaN(d.getTime()) ? new Date() : d).toISOString().slice(0, 10);
}
