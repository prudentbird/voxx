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

export function splitDatePrefix(name: string): { date?: string; rest: string } {
  const m = DATE_PREFIX_RE.exec(name);
  if (!m) return { rest: name };
  return { date: `${m[1]}-${m[2]}-${m[3]}`, rest: m[4]! };
}

const ORDER_PREFIX_RE = /^(\d{1,4})[-_.](.+)$/;

export function splitOrderPrefix(name: string): {
  order?: number;
  rest: string;
} {
  const m = ORDER_PREFIX_RE.exec(name);
  if (!m) return { rest: name };
  return { order: Number(m[1]), rest: m[2]! };
}

export function humanize(segment: string): string {
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .trim();
}

export function joinPath(base: string, slug: string): string {
  const left = base.replace(/\/+$/, "");
  const right = slug.replace(/^\/+/, "");
  const prefix = left.startsWith("/") ? left : `/${left}`;
  return `${prefix}/${right}`.replace(/([^:])\/{2,}/g, "$1/");
}

export function absoluteUrl(siteUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const origin = siteUrl.replace(/\/+$/, "");
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${rel}`;
}

export function readingTimeMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

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

export function parseVersion(name: string): string | undefined {
  const m = VERSION_RE.exec(name);
  return m ? m[1] : undefined;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function rfc822(date: string): string {
  const d = new Date(date);
  return (isNaN(d.getTime()) ? new Date() : d).toUTCString();
}

export function isoDate(date: string): string {
  const d = new Date(date);
  return (isNaN(d.getTime()) ? new Date() : d).toISOString().slice(0, 10);
}
