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
 * Normalizes unicode, lowercases, trims, and replaces non-alphanumeric
 * characters with hyphens.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
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

/**
 * Extracts a plain-text excerpt from Markdown, stripping code blocks,
 * headings, and inline markup.
 *
 * @param markdown - Raw Markdown source.
 * @param max - Maximum character length before truncation. Defaults to `180`.
 */
export function deriveExcerpt(markdown: string, max = 180): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/^#{1,6}\s.*$/gm, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_>#~]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

/**
 * Formats an ISO 8601 date string for display.
 *
 * @param iso - ISO date string, e.g. `"2024-01-15"`.
 * @param locale - BCP 47 locale. Defaults to `"en-US"`.
 * @returns Formatted string like `"January 15, 2024"`, or the original string if invalid.
 */
export function formatDate(iso: string, locale = "en-US"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, {
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
