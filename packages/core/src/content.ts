import { Effect, Option } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { parseFrontmatter } from "./frontmatter";
import { renderMarkdownEffect } from "./render";
import { ConfigError, PostNotFound } from "./errors";
import {
  compareVersions,
  deriveExcerpt,
  joinPath,
  normalizeAuthors,
  parseVersion,
  readingTimeMinutes,
  slugify,
  splitDatePrefix,
  splitOrderPrefix,
} from "./util";
import type { Post, PostMeta, VoxxConfig } from "./types";

const MD_RE = /\.md$/;

/** Options for filtering and paginating posts returned by the content readers. */
export interface GetPostsEffectOptions {
  /** When `true`, includes posts whose frontmatter sets `draft: true`, regardless of the `drafts` config. */
  includeDrafts?: boolean;
  /**
   * When `true`, returns the *reachable* set — every post that has its own page,
   * including unlisted drafts (`drafts: "unlisted"`). When unset, returns the
   * *listed* set used for indexes and feeds.
   */
  reachable?: boolean;
  /** Restricts results to a named collection defined in `config.collections`. */
  collection?: string;
  /** Keeps only posts whose `tags` include this value. */
  tag?: string;
  /** Keeps only posts whose `category` equals this value. */
  category?: string;
  /** Skips this many posts from the start of the sorted, filtered set. */
  offset?: number;
  /** Caps the result to this many posts. When unset, returns all remaining. */
  limit?: number;
  /**
   * Prepended to resolved asset URLs in rendered HTML (see
   * {@link RenderOptions.assetPrefix}). Only hosts that serve content assets
   * through a route handler need to set it.
   */
  assetPrefix?: string;
}

/** Result of `listPostsEffect` — a page of metadata plus the unpaginated total. */
export interface ListPostsResult {
  /** Post metadata for the requested page, in the collection's natural order. */
  posts: PostMeta[];
  /** Total posts matching the filters, before `offset`/`limit` are applied. */
  total: number;
}

const orderKey = (order: number | undefined, slug: string) =>
  `${String(order ?? 9999).padStart(4, "0")} ${slug}`;

/**
 * A post's metadata plus the bookkeeping needed to render it later. `content`
 * is intentionally absent so a metadata pass over a large content set stays
 * cheap; rendering re-reads the file for only the posts that are returned.
 */
interface BuiltMeta {
  meta: PostMeta;
  sortKey: string;
  absPath: string;
  rel: string;
  assetBase: string;
}

const buildMeta = (config: VoxxConfig, absPath: string, rel: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const raw = yield* fs.readFileString(absPath);
    const { data, content } = yield* parseFrontmatter(rel, raw);
    const isDocs = config.content.type === "docs";
    const isChangelog = config.content.type === "changelog";

    const segments = rel.replace(MD_RE, "").split(/[\\/]/).filter(Boolean);
    const fileBase = segments.pop() ?? rel;

    const dirOrders: Array<number | undefined> = [];
    const dirSlugs = segments.map((seg) => {
      const { order, rest } = isDocs
        ? splitOrderPrefix(seg)
        : { order: undefined, rest: seg };
      dirOrders.push(order);
      return slugify(rest);
    });

    const { date: filenameDate, rest: dateRest } = splitDatePrefix(fileBase);
    const { order: fileOrder, rest } = isDocs
      ? splitOrderPrefix(dateRest)
      : { order: undefined, rest: dateRest };
    const baseSlug = data.slug ? slugify(data.slug) : slugify(rest);

    const isIndex = isDocs && !data.slug && baseSlug === "index";
    const path = isDocs
      ? isIndex
        ? dirSlugs
        : [...dirSlugs, baseSlug]
      : [baseSlug];
    const slug = path[path.length - 1] ?? "";
    const order =
      data.order ??
      fileOrder ??
      (isIndex ? dirOrders[dirOrders.length - 1] : undefined);

    const version = isChangelog
      ? (data.version ?? parseVersion(dateRest))
      : data.version;

    const baseUrl = joinPath(config.content.basePath, "/").replace(
      /(.)\/+$/,
      "$1",
    );
    const urlPath = path.join("/");
    const url = isChangelog
      ? `${baseUrl}#${slug}`
      : urlPath
        ? joinPath(config.content.basePath, urlPath)
        : baseUrl;

    const levelKeys = dirSlugs.map((s, i) => orderKey(dirOrders[i], s));
    if (isIndex) {
      if (levelKeys.length > 0)
        levelKeys[levelKeys.length - 1] = orderKey(order, slug);
    } else {
      levelKeys.push(orderKey(order, slug));
    }
    const sortKey = levelKeys.join("/");

    const dirRel = rel.split(/[\\/]/).slice(0, -1).join("/");
    const assetBase = dirRel
      ? joinPath(config.content.basePath, dirRel)
      : config.content.basePath;

    let date = data.date ?? filenameDate;
    if (!date) {
      if (!isDocs) {
        yield* Effect.logWarning(
          `${rel}: no date in frontmatter or filename — falling back to the file's creation time, which is not stable across checkouts.`,
        );
      }
      const info = yield* fs.stat(absPath);
      const created =
        Option.getOrUndefined(info.birthtime) ??
        Option.getOrUndefined(info.mtime);
      date = (created ?? new Date()).toISOString();
    }

    const meta: PostMeta = {
      slug,
      path,
      url,
      title: data.title,
      description: data.description,
      date,
      updated: data.updated,
      tags: [...data.tags],
      category: data.category,
      order,
      version,
      draft: data.draft,
      image: data.image,
      authors: normalizeAuthors(data.author),
      excerpt: data.excerpt ?? deriveExcerpt(content),
      readingTimeMinutes: readingTimeMinutes(content),
    };
    return { meta, sortKey, absPath, rel, assetBase } satisfies BuiltMeta;
  });

/**
 * Renders a built post's Markdown body, producing the full {@link Post}. The
 * file is re-read here so the metadata pass can discard raw content and stay
 * memory-light over large content sets.
 */
const renderBuilt = (
  config: VoxxConfig,
  built: BuiltMeta,
  opts: GetPostsEffectOptions = {},
) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const raw = yield* fs.readFileString(built.absPath);
    const { content } = yield* parseFrontmatter(built.rel, raw);
    const { html, toc } = yield* renderMarkdownEffect(content, config, {
      assetBase: built.assetBase,
      assetPrefix: opts.assetPrefix,
    });
    return { ...built.meta, html, toc, content } satisfies Post;
  });

const matchesSlug = (meta: PostMeta, wanted: string) =>
  meta.path.join("/") === wanted ||
  (meta.path.length <= 1 && meta.slug === wanted);

const paginate = <T>(items: T[], opts: GetPostsEffectOptions): T[] => {
  const start = opts.offset ?? 0;
  const end = opts.limit !== undefined ? start + opts.limit : undefined;
  return start === 0 && end === undefined ? items : items.slice(start, end);
};

/**
 * Reads every Markdown file in the active collection and returns their
 * metadata, filtered by draft visibility, `tag`, and `category`, then sorted
 * in the collection's natural order. No Markdown is rendered — this is the
 * cheap pass that listing, pagination, and slug lookup build on.
 *
 * - **docs** — sorted by numeric directory/file order prefix.
 * - **changelog** — sorted by date descending, then semver descending.
 * - **blog** — sorted by date descending.
 */
const collectMetas = (config: VoxxConfig, opts: GetPostsEffectOptions) =>
  Effect.gen(function* () {
    if (opts.collection) {
      const active = config.collections?.find(
        (c) => c.name === opts.collection,
      );
      if (!active) {
        return yield* new ConfigError({
          message: `Unknown collection "${opts.collection}" — defined: ${(
            config.collections ?? []
          )
            .map((c) => c.name)
            .join(", ")}`,
        });
      }
      config = { ...config, content: active };
    }

    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = config.content.dir;

    const exists = yield* fs
      .exists(dir)
      .pipe(Effect.orElseSucceed(() => false));
    if (!exists) {
      yield* Effect.logWarning(
        `Content directory "${dir}" does not exist — treating it as empty.`,
      );
      return [] as BuiltMeta[];
    }

    const entries = yield* fs.readDirectory(dir, { recursive: true });
    const files = entries.filter((f) => MD_RE.test(f));
    const mode = config.content.drafts;
    const includeDrafts =
      opts.includeDrafts !== undefined
        ? opts.includeDrafts
        : opts.reachable
          ? mode !== false
          : mode === true;

    const built = yield* Effect.forEach(
      files,
      (rel) => buildMeta(config, path.join(dir, rel), rel),
      { concurrency: 8 },
    );

    const seen = new Map<string, string>();
    for (let i = 0; i < built.length; i++) {
      const key = built[i]!.meta.path.join("/");
      const previous = seen.get(key);
      if (previous !== undefined) {
        yield* Effect.logWarning(
          `Duplicate slug "${key}": ${files[i]} collides with ${previous} — only one will be reachable.`,
        );
      } else {
        seen.set(key, files[i]!);
      }
    }

    const visible = built.filter((b) => {
      if (!includeDrafts && b.meta.draft) return false;
      if (opts.tag && !b.meta.tags.includes(opts.tag)) return false;
      if (opts.category && b.meta.category !== opts.category) return false;
      return true;
    });

    if (config.content.type === "docs") {
      return visible.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }

    const isChangelog = config.content.type === "changelog";
    return visible.sort((a, b) => {
      const byDate = b.meta.date.localeCompare(a.meta.date);
      if (byDate !== 0) return byDate;
      if (isChangelog && a.meta.version && b.meta.version) {
        return compareVersions(b.meta.version, a.meta.version);
      }
      return a.meta.slug.localeCompare(b.meta.slug);
    });
  });

/**
 * Lists post metadata for the active collection without rendering any Markdown.
 * Supports `tag`/`category` filtering and `offset`/`limit` pagination, and
 * returns the unpaginated `total` so callers can build page controls.
 *
 * Use this for indexes, navigation, sitemaps, and feeds that only need
 * metadata — it scales to large content sets because no post is rendered.
 *
 * @param config - Resolved Voxx config.
 * @param opts - Collection, draft visibility, filter, and pagination options.
 */
export const listPostsEffect = (
  config: VoxxConfig,
  opts: GetPostsEffectOptions = {},
) =>
  Effect.gen(function* () {
    const all = yield* collectMetas(config, opts);
    return {
      posts: paginate(all, opts).map((b) => b.meta),
      total: all.length,
    } satisfies ListPostsResult;
  });

/**
 * Reads the active collection and returns fully rendered posts. Filtering and
 * pagination are applied to metadata first, so only the posts actually
 * returned are rendered to HTML.
 *
 * @param config - Resolved Voxx config.
 * @param opts - Collection, draft visibility, filter, and pagination options.
 */
export const getPostsEffect = (
  config: VoxxConfig,
  opts: GetPostsEffectOptions = {},
) =>
  Effect.gen(function* () {
    const all = yield* collectMetas(config, opts);
    return yield* Effect.forEach(
      paginate(all, opts),
      (built) => renderBuilt(config, built, opts),
      { concurrency: 8 },
    );
  });

/**
 * Finds a post in an already-loaded array by slug or path.
 *
 * @param posts - Array of post metadata, e.g. from `listPosts` or `getPosts`.
 * @param slug - Slash-separated path, e.g. `"getting-started/install"`.
 * @returns The matching post, or `undefined` if not found.
 */
export function findPost<T extends PostMeta>(
  posts: T[],
  slug: string,
): T | undefined {
  const wanted = slug.split("/").filter(Boolean).map(slugify).join("/");
  return posts.find((p) => matchesSlug(p, wanted));
}

/**
 * Resolves a single post by slug and renders only that post — the rest of the
 * collection is scanned for metadata but never rendered.
 * Throws `PostNotFound` if no match exists.
 */
export const getPostEffect = (
  config: VoxxConfig,
  slug: string,
  opts: GetPostsEffectOptions = {},
) =>
  Effect.gen(function* () {
    const all = yield* collectMetas(config, {
      ...opts,
      reachable: opts.reachable ?? true,
    });
    const wanted = slug.split("/").filter(Boolean).map(slugify).join("/");
    const built = all.find((b) => matchesSlug(b.meta, wanted));
    if (!built) return yield* new PostNotFound({ slug });
    return yield* renderBuilt(config, built, opts);
  });
