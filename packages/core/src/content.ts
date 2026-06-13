import { Effect, Option } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { parseFrontmatter } from "./frontmatter";
import { renderMarkdownEffect } from "./render";
import { ConfigError, ContentDirMissing, PostNotFound } from "./errors";
import {
  compareVersions,
  deriveExcerpt,
  joinPath,
  parseVersion,
  readingTimeMinutes,
  slugify,
  splitDatePrefix,
  splitOrderPrefix,
} from "./util";
import type { Post, VoxxConfig } from "./types";

const MD_RE = /\.md$/;

/** Options for filtering posts returned by `getPostsEffect`. */
export interface GetPostsEffectOptions {
  /** When `true`, includes posts whose frontmatter sets `draft: true`. */
  includeDrafts?: boolean;
  /** Restricts results to a named collection defined in `config.collections`. */
  collection?: string;
}
const orderKey = (order: number | undefined, slug: string) =>
  `${String(order ?? 9999).padStart(4, "0")} ${slug}`;

interface BuiltPost {
  post: Post;
  sortKey: string;
}

const buildPost = (config: VoxxConfig, absPath: string, rel: string) =>
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
    const { html, toc } = yield* renderMarkdownEffect(content, config, {
      assetBase,
    });

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

    const post: Post = {
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
      author: data.author,
      excerpt: data.excerpt ?? deriveExcerpt(content),
      readingTimeMinutes: readingTimeMinutes(content),
      html,
      toc,
      content,
    };
    return { post, sortKey } satisfies BuiltPost;
  });

/**
 * Reads all Markdown files from the configured content directory,
 * renders them, and returns sorted posts.
 *
 * - **docs** — sorted by numeric directory/file order prefix.
 * - **changelog** — sorted by date descending, then semver descending.
 * - **blog** — sorted by date descending.
 *
 * @param config - Resolved Voxx config.
 * @param opts - Optional collection filter and draft visibility.
 */
export const getPostsEffect = (
  config: VoxxConfig,
  opts: GetPostsEffectOptions = {},
) =>
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
    if (!exists) return yield* new ContentDirMissing({ dir });

    const entries = yield* fs.readDirectory(dir, { recursive: true });
    const files = entries.filter((f) => MD_RE.test(f));
    const includeDrafts = opts.includeDrafts ?? config.content.drafts;

    const built = yield* Effect.forEach(
      files,
      (rel) => buildPost(config, path.join(dir, rel), rel),
      { concurrency: 8 },
    );

    const seen = new Map<string, string>();
    for (let i = 0; i < built.length; i++) {
      const key = built[i]!.post.path.join("/");
      const previous = seen.get(key);
      if (previous !== undefined) {
        yield* Effect.logWarning(
          `Duplicate slug "${key}": ${files[i]} collides with ${previous} — only one will be reachable.`,
        );
      } else {
        seen.set(key, files[i]!);
      }
    }

    const visible = built.filter((b) => includeDrafts || !b.post.draft);

    if (config.content.type === "docs") {
      return visible
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map((b) => b.post);
    }

    const isChangelog = config.content.type === "changelog";

    return visible
      .map((b) => b.post)
      .sort((a, b) => {
        const byDate = b.date.localeCompare(a.date);
        if (byDate !== 0) return byDate;
        if (isChangelog && a.version && b.version) {
          return compareVersions(b.version, a.version);
        }
        return a.slug.localeCompare(b.slug);
      });
  });

/**
 * Finds a post in an already-loaded array by slug or path.
 *
 * @param posts - Array returned by `getPosts`.
 * @param slug - Slash-separated path, e.g. `"getting-started/install"`.
 * @returns The matching post, or `undefined` if not found.
 */
export function findPost(posts: Post[], slug: string): Post | undefined {
  const wanted = slug.split("/").filter(Boolean).map(slugify).join("/");
  return posts.find(
    (p) =>
      p.path.join("/") === wanted || (p.path.length <= 1 && p.slug === wanted),
  );
}

/**
 * Loads all posts and returns the one matching `slug`.
 * Throws `PostNotFound` if no match exists.
 */
export const getPostEffect = (
  config: VoxxConfig,
  slug: string,
  opts: GetPostsEffectOptions = {},
) =>
  Effect.gen(function* () {
    const posts = yield* getPostsEffect(config, opts);
    const post = findPost(posts, slug);
    if (!post) return yield* new PostNotFound({ slug });
    return post;
  });
