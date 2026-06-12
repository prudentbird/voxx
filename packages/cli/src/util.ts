import { createRequire } from "node:module";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const TEMPLATES_DIR = fileURLToPath(new URL("../templates", import.meta.url));

const useColor = process.stdout.isTTY && !process.env["NO_COLOR"];
const wrap = (code: string) => (s: string) =>
  useColor ? `[${code}m${s}[0m` : s;

export const c = {
  bold: wrap("1"),
  dim: wrap("2"),
  red: wrap("31"),
  green: wrap("32"),
  yellow: wrap("33"),
  cyan: wrap("36"),
};

export const log = {
  info: (msg: string) => console.log(msg),
  success: (msg: string) => console.log(`${c.green("✓")} ${msg}`),
  warn: (msg: string) => console.log(`${c.yellow("!")} ${msg}`),
  error: (msg: string) => console.error(`${c.red("✗")} ${msg}`),
};

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readTemplate(name: string): Promise<string> {
  return readFile(join(TEMPLATES_DIR, name), "utf8");
}

export function render(tpl: string, vars: Record<string, string> = {}): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export type WriteStatus = "written" | "skipped";

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

export function resolveCoreAsset(subpath: string): string {
  return require.resolve(`@voxx/core/${subpath}`);
}

export function titleCase(name: string): string {
  return name
    .replace(/^@[^/]+\//, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
}

export function normalizeBase(base: string): string {
  const withLead = base.startsWith("/") ? base : `/${base}`;
  return withLead.length > 1 ? withLead.replace(/\/+$/, "") : withLead;
}

// A plain (unquoted) YAML scalar is only safe for a conservative charset.
// Anything else is emitted as a double-quoted scalar — JSON string escaping
// is valid YAML, so JSON.stringify does the quoting and escaping in one step.
const YAML_PLAIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9 ._/()-]*[A-Za-z0-9._/()-])?$/;

export function yamlValue(value: string): string {
  return YAML_PLAIN_RE.test(value) ? value : JSON.stringify(value);
}
