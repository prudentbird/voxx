import { Effect, ParseResult, Schema } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { ConfigInput, type VoxxConfigInput } from "./schema";
import { ConfigError } from "./errors";
import {
  DEFAULT_CONFIG,
  type CollectionConfig,
  type ContentType,
  type VoxxConfig,
} from "./types";

export interface LoadConfigOptions {
  cwd?: string;
  path?: string;
}

const TYPE_FEATURE_DEFAULTS: Record<
  ContentType,
  Partial<VoxxConfig["features"]>
> = {
  blog: {},
  docs: { rss: false, readingTime: false, tags: false },
  changelog: {
    toc: false,
    sitemap: false,
    readingTime: false,
    tags: false,
  },
};

export interface CollectionInput {
  readonly name?: string;
  readonly type?: ContentType;
  readonly dir?: string;
  readonly basePath?: string;
  readonly drafts?: boolean;
}

/**
 * The naming contract for `collections` entries: `name ?? type`,
 * `dir ?? content/<name>`, `basePath ?? /<name>`. This function is the single
 * owner of that defaulting — the CLI (`voxx new`, `voxx init --add`) imports
 * it instead of mirroring the rules. Pure and Effect-free by design.
 */
export function resolveCollectionDefaults(c: CollectionInput): CollectionConfig {
  const type = c.type ?? "blog";
  const name = c.name ?? type;
  return {
    name,
    type,
    dir: c.dir ?? `content/${name}`,
    basePath: c.basePath ?? `/${name}`,
    drafts: c.drafts ?? false,
  };
}

function mergeCollections(input: VoxxConfigInput): CollectionConfig[] {
  const d = DEFAULT_CONFIG;
  if (input.collections && input.collections.length > 0) {
    return input.collections.map(resolveCollectionDefaults);
  }
  const type = input.content?.type ?? d.content.type;
  return [
    {
      name: type,
      type,
      dir: input.content?.dir ?? d.content.dir,
      basePath: input.content?.basePath ?? d.content.basePath,
      drafts: input.content?.drafts ?? d.content.drafts,
    },
  ];
}

function mergeConfig(input: VoxxConfigInput): VoxxConfig {
  const d = DEFAULT_CONFIG;
  const collections = mergeCollections(input);
  const first = collections[0]!;
  const featureDefaults = {
    ...d.features,
    ...TYPE_FEATURE_DEFAULTS[first.type],
  };
  return {
    site: {
      title: input.site.title,
      description: input.site.description ?? d.site.description,
      url: input.site.url,
      author: input.site.author
        ? { name: input.site.author.name, url: input.site.author.url }
        : d.site.author,
      locale: input.site.locale ?? d.site.locale,
    },
    content: {
      type: first.type,
      dir: first.dir,
      basePath: first.basePath,
      drafts: first.drafts,
    },
    collections,
    theme: {
      preset: input.theme?.preset ?? d.theme.preset,
      css: input.theme?.css ?? d.theme.css,
      codeTheme: input.theme?.codeTheme ?? d.theme.codeTheme,
    },
    features: {
      toc: input.features?.toc ?? featureDefaults.toc,
      rss: input.features?.rss ?? featureDefaults.rss,
      sitemap: input.features?.sitemap ?? featureDefaults.sitemap,
      llmsTxt: input.features?.llmsTxt ?? featureDefaults.llmsTxt,
      tags: input.features?.tags ?? featureDefaults.tags,
      readingTime: input.features?.readingTime ?? featureDefaults.readingTime,
    },
    seo: {
      openGraph: input.seo?.openGraph ?? d.seo.openGraph,
      twitter: input.seo?.twitter ?? d.seo.twitter,
      jsonLd: input.seo?.jsonLd ?? d.seo.jsonLd,
      defaultImage: input.seo?.defaultImage ?? d.seo.defaultImage,
    },
  };
}

export const resolveConfig = (data: unknown, cwd: string) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const decoded = yield* Schema.decodeUnknown(ConfigInput)(data).pipe(
      Effect.mapError(
        (cause) =>
          new ConfigError({
            message: `voxx.json failed validation:\n${ParseResult.TreeFormatter.formatErrorSync(cause)}`,
            cause,
          }),
      ),
    );
    const merged = mergeConfig(decoded);
    const resolveDir = (dir: string) =>
      path.isAbsolute(dir) ? dir : path.join(cwd, dir);
    return {
      ...merged,
      content: { ...merged.content, dir: resolveDir(merged.content.dir) },
      collections: merged.collections.map((c) => ({
        ...c,
        dir: resolveDir(c.dir),
      })),
    } satisfies VoxxConfig;
  });

export const loadConfigEffect = (opts: LoadConfigOptions = {}) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const cwd = opts.cwd ?? process.cwd();
    const configPath = opts.path ?? path.join(cwd, "voxx.json");

    const exists = yield* fs
      .exists(configPath)
      .pipe(
        Effect.mapError(
          (cause) =>
            new ConfigError({
              message: `Could not access ${configPath}`,
              cause,
            }),
        ),
      );
    if (!exists) {
      return yield* new ConfigError({
        message: `No voxx.json found at ${configPath}. Run \`voxx init\` to create one.`,
      });
    }

    const raw = yield* fs
      .readFileString(configPath)
      .pipe(
        Effect.mapError(
          (cause) =>
            new ConfigError({ message: `Could not read ${configPath}`, cause }),
        ),
      );

    const data = yield* Effect.try({
      try: () => JSON.parse(raw) as unknown,
      catch: (cause) =>
        new ConfigError({ message: `${configPath} is not valid JSON`, cause }),
    });

    return yield* resolveConfig(data, cwd);
  });
