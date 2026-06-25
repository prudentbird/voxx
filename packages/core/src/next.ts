import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  recordCoreApiCall,
  recordCoreIssue,
  recordCoreUsage,
} from "./telemetry";

const CORE_PACKAGE = "@prudentbird/voxx-core";
const DEFAULT_CONTENT_DIR = "content";

/** Options for {@link withVoxx}. */
export interface WithVoxxOptions {
  /** Directory containing `voxx.json`. Defaults to `process.cwd()`. */
  cwd?: string;
}

/** The Next.js config fields {@link withVoxx} manages; all other fields pass through unchanged. */
interface ManagedConfig {
  cacheComponents?: boolean;
  serverExternalPackages?: string[];
  outputFileTracingIncludes?: Record<string, string[]>;
}

interface RawCollection {
  name?: string;
  type?: string;
  dir?: string;
}

interface RawConfig {
  content?: { dir?: string; type?: string };
  collections?: RawCollection[];
}

/**
 * Reads the relative content directories declared in `voxx.json`, falling back
 * to the default `content` directory when the file is missing or unreadable.
 */
function contentDirs(cwd: string): string[] {
  try {
    const data = JSON.parse(
      readFileSync(join(cwd, "voxx.json"), "utf8"),
    ) as RawConfig;
    const dirs = new Set<string>();
    for (const c of data.collections ?? []) {
      dirs.add(c.dir ?? `${DEFAULT_CONTENT_DIR}/${c.name ?? c.type ?? "blog"}`);
    }
    if (data.content?.dir) dirs.add(data.content.dir);
    return dirs.size > 0 ? [...dirs] : [DEFAULT_CONTENT_DIR];
  } catch (error) {
    recordCoreIssue("with_voxx_config_read_failed", error);
    return [DEFAULT_CONTENT_DIR];
  }
}

/**
 * Wraps a Next.js config with the settings every Voxx app needs to run
 * correctly on serverless platforms.
 *
 * Enables Cache Components, marks `@prudentbird/voxx-core` as an external
 * server package, and traces `voxx.json` plus every content directory into the
 * serverless function bundle so runtime config and content reads resolve. Voxx
 * content is filesystem-backed and read at request time during cache
 * revalidation, so without these includes those reads fail on platforms that
 * bundle each route into an isolated function.
 *
 * @param config - Base Next.js config. Existing values are preserved; `cacheComponents` defaults to `true` when unset.
 * @param options - Optional `cwd` override for locating `voxx.json`.
 * @returns The base config merged with Voxx's required settings.
 */
export function withVoxx<T extends object>(
  config: T = {} as T,
  options: WithVoxxOptions = {},
): T & {
  cacheComponents: boolean;
  serverExternalPackages: string[];
  outputFileTracingIncludes: Record<string, string[]>;
} {
  recordCoreUsage();
  const start = performance.now();
  try {
    const base = config as T & ManagedConfig;
    const dirs = contentDirs(options.cwd ?? process.cwd());
    const includes = ["./voxx.json", ...dirs.map((dir) => `./${dir}/**/*`)];
    const existing = base.outputFileTracingIncludes ?? {};

    const nextConfig = {
      ...base,
      cacheComponents: base.cacheComponents ?? true,
      serverExternalPackages: [
        ...new Set([...(base.serverExternalPackages ?? []), CORE_PACKAGE]),
      ],
      outputFileTracingIncludes: {
        ...existing,
        "/*": [...new Set([...(existing["/*"] ?? []), ...includes])],
      },
    };
    recordCoreApiCall("withVoxx", start, true, {
      content_dir_count: dirs.length,
      had_cache_components: base.cacheComponents !== undefined,
      had_server_external_packages: base.serverExternalPackages !== undefined,
      had_tracing_includes: base.outputFileTracingIncludes !== undefined,
    });
    return nextConfig;
  } catch (err) {
    recordCoreApiCall("withVoxx", start, false, {}, err);
    throw err;
  }
}
