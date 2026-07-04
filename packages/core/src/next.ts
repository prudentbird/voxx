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
 * Wraps a Next.js config with the serverless plumbing every Voxx app needs.
 *
 * Marks `@prudentbird/voxx-core` as an external server package and traces
 * `voxx.json` plus every content directory into the serverless function bundle
 * so runtime config and content reads resolve. Voxx content is
 * filesystem-backed and read at request time (JSON API routes, and cache
 * revalidation under Cache Components), so without these includes those reads
 * fail on platforms that bundle each route into an isolated function.
 *
 * The helper does not manage the app's rendering mode. It never sets
 * `cacheComponents`; that flag stays entirely under the host's control and
 * passes through untouched like any unmanaged field.
 *
 * @param config - Base Next.js config. Existing values are preserved.
 * @param options - Optional `cwd` override for locating `voxx.json`.
 * @returns The base config merged with Voxx's required settings.
 */
export function withVoxx<T extends object>(
  config: T = {} as T,
  options: WithVoxxOptions = {},
): T & {
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
      host_cache_components:
        (base as { cacheComponents?: unknown }).cacheComponents === true,
      had_server_external_packages: base.serverExternalPackages !== undefined,
      had_tracing_includes: base.outputFileTracingIncludes !== undefined,
    });
    return nextConfig;
  } catch (err) {
    recordCoreApiCall("withVoxx", start, false, {}, err);
    throw err;
  }
}
