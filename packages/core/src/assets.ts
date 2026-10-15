import { Effect, Option } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
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

/**
 * Normalizes to forward slashes so containment checks compare like with
 * like: `collection.dir` may arrive verbatim from config (Windows absolute
 * dirs such as `C:/content/blog` skip normalization), while `path.join`
 * output follows platform conventions.
 */
const normalizeSeparators = (p: string) => p.replaceAll("\\", "/");

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

/** A collection-relative file path must be visible and below assets/. */
function isAssetPath(relativePath: string): boolean {
  const segments = relativePath.split("/");
  const assetsIndex = segments.indexOf(ASSET_DIR);
  return (
    assetsIndex !== -1 &&
    assetsIndex < segments.length - 1 &&
    segments.every(
      (s) => s.length > 0 && !s.startsWith(".") && !s.includes("\\"),
    ) &&
    !SOURCE_RE.test(relativePath)
  );
}

/** Resolve a visible asset file, checking both its requested and real paths. */
const resolveContentAssetEffect = (
  collectionDir: string,
  relativePath: string,
) =>
  Effect.gen(function* () {
    if (!isAssetPath(relativePath)) return null;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const filePath = path.join(collectionDir, ...relativePath.split("/"));
    const root = normalizeSeparators(path.join(collectionDir));
    const rawPrefix = root.endsWith("/") ? root : `${root}/`;
    if (!normalizeSeparators(filePath).startsWith(rawPrefix)) return null;

    const [rootReal, real] = yield* Effect.all([
      fs.realPath(collectionDir).pipe(Effect.option),
      fs.realPath(filePath).pipe(Effect.option),
    ]);
    if (Option.isNone(rootReal) || Option.isNone(real)) return null;
    const realRelative = path.relative(rootReal.value, real.value);
    if (path.isAbsolute(realRelative)) return null;
    // Symlinks cannot disguise hidden files, Markdown, non-asset targets,
    // or paths outside the collection (which contain a leading .. segment).
    if (!isAssetPath(realRelative.split(path.sep).join("/"))) return null;
    const info = yield* fs.stat(real.value).pipe(Effect.option);
    if (Option.isNone(info) || info.value.type !== "File") return null;
    return real.value;
  });

/**
 * Returns the real path of a servable collection asset, or null. The input is
 * a collection-relative path with forward slashes, not a URL (no decoding).
 * Used by static builds and the Next.js route to enforce the same boundary.
 */
export function resolveContentAsset(
  collectionDir: string,
  relativePath: string,
): Promise<string | null> {
  return Effect.runPromise(
    Effect.provide(
      resolveContentAssetEffect(collectionDir, relativePath),
      NodeContext.layer,
    ),
  );
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
    for (const collection of candidates) {
      const baseSegments = collection.basePath.split("/").filter(Boolean);
      if (segments.length <= baseSegments.length) continue;
      if (baseSegments.some((s, i) => s !== segments[i])) continue;

      // The longest matching basePath owns this URL outright: if the file
      // doesn't resolve within it, answer null instead of letting a shorter
      // collection substitute its own file.
      const rel = segments.slice(baseSegments.length);
      const filePath = yield* resolveContentAssetEffect(
        collection.dir,
        rel.join("/"),
      );
      if (filePath === null) return null;

      const mime =
        MIME_TYPES[rel[rel.length - 1]!.split(".").pop()!.toLowerCase()];
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
