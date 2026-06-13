import {
  existsSync,
  mkdirSync,
  readdirSync,
  watch,
  writeFileSync,
  type Dirent,
  type FSWatcher,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { Effect } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { loadConfigEffect } from "./config";

type Services = FileSystem.FileSystem | Path.Path;

const run = <A, E>(effect: Effect.Effect<A, E, Services>): Promise<A> =>
  Effect.runPromise(Effect.provide(effect, NodeContext.layer));

/** Options for `registerContentWatcher`. */
export interface ContentWatcherOptions {
  /** Working directory used to locate `voxx.json` and content dirs. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Explicit paths to `content-version.ts` files to bump on change. Auto-discovered when omitted. */
  versionModules?: string[];
  /** Milliseconds to wait before writing after the last change event. Defaults to `80`. */
  debounceMs?: number;
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".turbo",
  "dist",
  "out",
]);
const VERSION_FILE = "content-version.ts";

function writeVersion(file: string, value: number): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `export const CONTENT_VERSION = ${value};\n`);
}

function findVersionModules(root: string, depth = 6): string[] {
  const found: string[] = [];
  const walk = (dir: string, left: number): void => {
    let entries: Dirent<string>[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
        if (left > 0) walk(join(dir, entry.name), left - 1);
      } else if (entry.name === VERSION_FILE && basename(dir) === "_voxx") {
        found.push(join(dir, entry.name));
      }
    }
  };
  walk(root, depth);
  return found;
}

let registered = false;

/**
 * Watches content directories and `voxx.json` for changes, then bumps a
 * `CONTENT_VERSION` timestamp in each discovered `_voxx/content-version.ts`
 * file to trigger Next.js hot reload.
 *
 * No-ops outside `NODE_ENV=development` and in non-Node runtimes (e.g. Edge).
 * Safe to call multiple times — only the first call registers watchers.
 *
 * @param opts - Optional cwd, explicit version module paths, and debounce delay.
 */
export async function registerContentWatcher(
  opts: ContentWatcherOptions = {},
): Promise<void> {
  if (process.env["NEXT_RUNTIME"] && process.env["NEXT_RUNTIME"] !== "nodejs") {
    return;
  }
  if (process.env.NODE_ENV !== "development") return;
  if (registered) return;
  registered = true;

  const cwd = opts.cwd ?? process.cwd();

  const versionModules =
    opts.versionModules && opts.versionModules.length > 0
      ? opts.versionModules
      : findVersionModules(cwd);
  if (versionModules.length === 0) return;

  const dirs = new Set<string>();
  try {
    const config = await run(loadConfigEffect({ cwd }));
    for (const collection of config.collections) dirs.add(collection.dir);
  } catch {}

  const paths = new Set<string>([join(cwd, "voxx.json"), ...dirs]);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const bump = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const value = Date.now();
      for (const file of versionModules) writeVersion(file, value);
    }, opts.debounceMs ?? 80);
  };

  const watchers: FSWatcher[] = [];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    try {
      watchers.push(watch(path, { recursive: true }, bump));
    } catch {}
  }
}
