import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DEFAULT_CONFIG,
  resolveCollectionDefaults,
  type CollectionInput,
} from "@prudentbird/voxx-core";
import { exists } from "./util";
import { type PlannedCollection } from "./collections";

const APP_DIR_CANDIDATES = ["app", "src/app"];
const GLOBALS_CANDIDATES = [
  "app/globals.css",
  "src/app/globals.css",
  "styles/globals.css",
  "src/styles/globals.css",
  "app/global.css",
];

/** Minimal shape read from a project's `package.json`. */
export interface Pkg {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/** Reads `package.json` from `cwd`, returning an empty object when absent. */
export async function readPkg(cwd: string): Promise<Pkg> {
  if (await exists(join(cwd, "package.json"))) {
    return JSON.parse(await readFile(join(cwd, "package.json"), "utf8"));
  }
  return {};
}

/** Returns `true` when `next` is a declared dependency. */
export function pkgHasNext(pkg: Pkg): boolean {
  return Boolean(pkg.dependencies?.["next"] ?? pkg.devDependencies?.["next"]);
}

/** Returns the App Router directory relative to `cwd`, or `null` if none. */
export async function detectAppDir(cwd: string): Promise<string | null> {
  for (const dir of APP_DIR_CANDIDATES) {
    if (await exists(join(cwd, dir))) return dir;
  }
  return null;
}

/** Returns `true` when a known globals stylesheet defines Voxx design tokens. */
export async function detectTokens(cwd: string): Promise<boolean> {
  for (const rel of GLOBALS_CANDIDATES) {
    const path = join(cwd, rel);
    if (await exists(path)) {
      const css = await readFile(path, "utf8");
      if (css.includes("--background") || css.includes("--foreground"))
        return true;
    }
  }
  return false;
}

type RawConfig = Record<string, unknown>;

/**
 * Resolves the collections declared in a raw `voxx.json` object, supporting
 * both the compact `content` form and the `collections` array.
 *
 * @param raw - Parsed `voxx.json` object.
 */
export function readCollections(raw: RawConfig): PlannedCollection[] {
  const rawCollections = Array.isArray(raw["collections"])
    ? (raw["collections"] as CollectionInput[])
    : [];
  if (rawCollections.length > 0) {
    return rawCollections.map(resolveCollectionDefaults);
  }
  const rawContent = (raw["content"] ?? undefined) as
    | CollectionInput
    | undefined;
  return [
    {
      name: rawContent?.type ?? DEFAULT_CONFIG.content.type,
      type: rawContent?.type ?? DEFAULT_CONFIG.content.type,
      dir: rawContent?.dir ?? DEFAULT_CONFIG.content.dir,
      basePath: rawContent?.basePath ?? DEFAULT_CONFIG.content.basePath,
    },
  ];
}

/** A loaded project's config and Next.js context. */
export interface Project {
  readonly cwd: string;
  readonly raw: RawConfig;
  readonly collections: PlannedCollection[];
  readonly hasNext: boolean;
  readonly appDir: string | null;
}

/**
 * Loads `voxx.json` and the surrounding Next.js context from `cwd`. Returns
 * `null` when no config exists, or throws when the config is invalid JSON.
 *
 * @param cwd - Project root.
 */
export async function loadProject(cwd: string): Promise<Project | null> {
  const cfgPath = join(cwd, "voxx.json");
  if (!(await exists(cfgPath))) return null;
  const raw = JSON.parse(await readFile(cfgPath, "utf8")) as RawConfig;
  const pkg = await readPkg(cwd);
  return {
    cwd,
    raw,
    collections: readCollections(raw),
    hasNext: pkgHasNext(pkg),
    appDir: await detectAppDir(cwd),
  };
}

/**
 * Writes a raw config object back to `voxx.json`, preserving 2-space
 * indentation and a trailing newline.
 *
 * @param cwd - Project root.
 * @param raw - Config object to serialize.
 */
export async function writeConfig(cwd: string, raw: RawConfig): Promise<void> {
  await writeFile(join(cwd, "voxx.json"), `${JSON.stringify(raw, null, 2)}\n`);
}
