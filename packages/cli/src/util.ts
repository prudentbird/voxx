import { createRequire } from "node:module";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const TEMPLATES_DIR = fileURLToPath(new URL("../templates", import.meta.url));

const useColor = process.stdout.isTTY && !process.env["NO_COLOR"];
const wrap = (code: string) => (s: string) =>
  useColor ? `[${code}m${s}[0m` : s;

/** ANSI color helpers that degrade gracefully in non-TTY environments. */
export const c = {
  bold: wrap("1"),
  dim: wrap("2"),
  red: wrap("31"),
  green: wrap("32"),
  yellow: wrap("33"),
  cyan: wrap("36"),
};

/** Prefixed console helpers used throughout the CLI commands. */
export const log = {
  info: (msg: string) => console.log(msg),
  success: (msg: string) => console.log(`${c.green("✓")} ${msg}`),
  warn: (msg: string) => console.log(`${c.yellow("!")} ${msg}`),
  error: (msg: string) => console.error(`${c.red("✗")} ${msg}`),
};

/**
 * Returns `true` if the path exists and is accessible, `false` otherwise.
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a scaffold template file by name from the bundled `templates/` directory.
 *
 * @param name - Template filename, e.g. `"shared/data.ts.tpl"`.
 */
export async function readTemplate(name: string): Promise<string> {
  return readFile(join(TEMPLATES_DIR, name), "utf8");
}

/**
 * Replaces `{{KEY}}` placeholders in a template string.
 *
 * @param tpl - Template string containing `{{VARIABLE}}` tokens.
 * @param vars - Map of token names to replacement values.
 */
export function render(tpl: string, vars: Record<string, string> = {}): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

/** Result of a `writeFileSafe` call. */
export type WriteStatus = "written" | "skipped";

/**
 * Writes `content` to `path`, creating parent directories as needed.
 * Skips the write if the file already exists and `force` is `false`.
 *
 * @param path - Destination file path.
 * @param content - File content to write.
 * @param force - Overwrite existing files when `true`. Defaults to `false`.
 * @returns `"written"` if the file was created/replaced, `"skipped"` if it already existed.
 */
export async function writeFileSafe(
  path: string,
  content: string,
  force = false,
): Promise<WriteStatus> {
  await mkdir(dirname(path), { recursive: true });
  if (!force && (await exists(path))) return "skipped";
  await writeFile(path, content);
  return "written";
}

/**
 * Resolves the path to a sub-asset of the installed `@prudentbird/voxx-core` package.
 *
 * @param subpath - Package-relative path, e.g. `"theme/voxx.css"`.
 */
export function resolveCoreAsset(subpath: string): string {
  return require.resolve(`@prudentbird/voxx-core/${subpath}`);
}

/**
 * Converts a package name or slug to Title Case.
 *
 * Strips any npm scope prefix (`@scope/`) before converting.
 */
export function titleCase(name: string): string {
  return name
    .replace(/^@[^/]+\//, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
}

/**
 * Returns `true` if the path is a safe relative path that stays within the
 * project root (no absolute paths, no `..` traversal, no null bytes).
 */
export function isSafeRelPath(p: string): boolean {
  if (p === "") return true;
  if (p.includes("\0")) return false;
  if (p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p)) return false;
  return p.split(/[\\/]/).every((seg) => seg !== "..");
}

/**
 * Normalizes a URL base path to always have a leading slash and no trailing slash.
 *
 * @param base - Raw base path, e.g. `"blog/"` or `"/blog"`.
 * @returns Normalized path, e.g. `"/blog"`.
 */
export function normalizeBase(base: string): string {
  const withLead = base.startsWith("/") ? base : `/${base}`;
  return withLead.length > 1 ? withLead.replace(/\/+$/, "") : withLead;
}

const YAML_PLAIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9 ._/()-]*[A-Za-z0-9._/()-])?$/;

/**
 * Returns a YAML-safe representation of `value`.
 *
 * Plain strings that match the safe character set are returned as-is;
 * everything else is JSON-quoted.
 */
export function yamlValue(value: string): string {
  return YAML_PLAIN_RE.test(value) ? value : JSON.stringify(value);
}
