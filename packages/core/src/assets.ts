import { Effect, Option } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { sep } from "node:path";
import { loadConfigEffect } from "./config";
import type { VoxxConfig } from "./types";

/**
 * URL prefix under which Next.js hosts serve files that live next to the
 * Markdown sources. Rendered HTML references assets as
 * `<prefix><basePath>/<relative path>`, and the scaffolded
 * catch-all route resolves them back onto the content directories.
 */
export const VOXX_ASSET_PREFIX = "/voxx-assets";

/** Directory name under which files are servable as content assets. */
export const ASSET_DIR = "assets";

const SOURCE_RE = /\.mdx?$/i;

const MIME_TYPES: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  htm: "text/html; charset=utf-8",
  html: "text/html; charset=utf-8",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain; charset=utf-8",
  webm: "video/webm",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  xml: "application/xml; charset=utf-8",
};

/** Decodes and validates the path segments after the prefix. */
function decodeSegments(pathname: string): string[] | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const segments = decoded.split("/").filter(Boolean);
  // Hidden/dot segments are never content assets, and rejecting them up front
  // also rules out `..` traversal outright. A decoded `\` would act as a path
  // separator on Windows hosts (e.g. `%5C..%5C`), so it is rejected too.
  if (
    segments.length === 0 ||
    segments.some((s) => s.startsWith(".") || s.includes("\\"))
  )
    return null;
  return segments;
}

interface CollectionLike {
  dir: string;
  basePath: string;
}

/**
 * Maps a `{@link VOXX_ASSET_PREFIX}`-prefixed URL pathname to a file inside an
 * `assets/` directory of one of the configured collections' content
 * directories.
 *
 * Collections are matched by longest `basePath` first so nested base paths win
 * over shorter ones. Only files below a directory named `assets` are served;
 * anything else maps to `null`: wrong prefix, malformed or traversing path
 * (including encoded `\` separators), dotfiles, Markdown sources
 * (case-insensitive), paths outside `assets/`, or a file that does not exist.
 */
export const serveContentAssetEffect = (pathname: string, config: VoxxConfig) =>
  Effect.gen(function* () {
    if (!pathname.startsWith(`${VOXX_ASSET_PREFIX}/`)) return null;
    const segments = decodeSegments(pathname.slice(VOXX_ASSET_PREFIX.length));
    if (!segments) return null;

    const collections: CollectionLike[] = config.collections ?? [
      config.content,
    ];
    const candidates = [...collections].sort(
      (a, b) => b.basePath.length - a.basePath.length,
    );

    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    for (const collection of candidates) {
      const baseSegments = collection.basePath.split("/").filter(Boolean);
      if (segments.length <= baseSegments.length) continue;
      if (baseSegments.some((s, i) => s !== segments[i])) continue;

      const rel = segments.slice(baseSegments.length);
      // Only files inside an `assets/` directory are served — everything else
      // in the content tree is page material, not a downloadable asset.
      const assetsIndex = rel.indexOf(ASSET_DIR);
      if (assetsIndex === -1 || assetsIndex === rel.length - 1) continue;
      const filePath = path.join(collection.dir, ...rel);
      // Belt-and-braces containment check: the segment validation above
      // should make this unreachable, but never serve from outside the
      // collection directory regardless of platform path quirks.
      const root = collection.dir.endsWith(sep)
        ? collection.dir
        : `${collection.dir}${sep}`;
      if (!filePath.startsWith(root)) continue;
      if (SOURCE_RE.test(filePath)) return null;

      const info = yield* fs.stat(filePath).pipe(Effect.option);
      if (Option.isNone(info) || info.value.type !== "File") continue;

      const mime = MIME_TYPES[rel[rel.length - 1]!.split(".").pop() ?? ""];
      const body = yield* fs.readFile(filePath);
      return new Response(new Uint8Array(body), {
        headers: {
          ...(mime ? { "Content-Type": mime } : {}),
          "Cache-Control": "public, max-age=0, must-revalidate",
        },
      });
    }
    return null;
  });

/**
 * Resolves a request pathname to a content asset and returns the response to
 * serve, or `null` when the pathname is not a servable content asset (callers
 * typically answer that with a 404).
 *
 * @param pathname - Root-relative request pathname, e.g. `/voxx-assets/blog/diagram.png`.
 * @param opts - Optional pre-loaded config, or `cwd`/`path` for locating `voxx.json`.
 */
export function serveContentAsset(
  pathname: string,
  opts: { config?: VoxxConfig; cwd?: string; path?: string } = {},
): Promise<Response | null> {
  const effect = Effect.gen(function* () {
    const config = opts.config ?? (yield* loadConfigEffect(opts));
    return yield* serveContentAssetEffect(pathname, config);
  });
  return Effect.runPromise(Effect.provide(effect, NodeContext.layer));
}
