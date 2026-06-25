import {
  DEFAULT_CONFIG,
  resolveCollectionDefaults,
  type CollectionInput,
  type ContentType,
} from "@prudentbird/voxx-core";
import { normalizeBase } from "./util";
import { type FeatureFlags, type FeatureKey, FEATURE_KEYS } from "./features";

/** Path written into a scaffolded `voxx.json`'s `$schema` field. */
export const SCHEMA_REF =
  "./node_modules/@prudentbird/voxx-core/voxx.schema.json";

/** A fully resolved collection ready to scaffold. */
export interface PlannedCollection {
  readonly name: string;
  readonly type: ContentType;
  readonly dir: string;
  readonly basePath: string;
}

/** Site-level metadata written to `voxx.json`'s `site` block. */
export interface SiteMeta {
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly locale: string;
}

/**
 * Builds a default collection for a content type, deriving `dir` and
 * `basePath` from the chosen name.
 *
 * @param type - Content type of the collection.
 * @param name - Collection name. Defaults to the type.
 */
export function defaultCollection(
  type: ContentType,
  name: string = type,
): PlannedCollection {
  return {
    name,
    type,
    dir: `content/${name}`,
    basePath: normalizeBase(`/${name}`),
  };
}

/** A unique-constraint violation found while planning collections. */
export interface CollectionConflict {
  readonly field: "name" | "dir" | "basePath";
  readonly value: string;
}

/**
 * Validates that a set of collections has no duplicate names, dirs, or base
 * paths. Returns the first conflict found, or `null` when the set is valid.
 *
 * @param collections - Collections to validate together.
 */
export function findConflict(
  collections: readonly PlannedCollection[],
): CollectionConflict | null {
  const seen: Record<"name" | "dir" | "basePath", Set<string>> = {
    name: new Set(),
    dir: new Set(),
    basePath: new Set(),
  };
  for (const c of collections) {
    for (const field of ["name", "dir", "basePath"] as const) {
      const value = c[field];
      if (seen[field].has(value)) return { field, value };
      seen[field].add(value);
    }
  }
  return null;
}

type RawConfig = Record<string, unknown>;

/**
 * Builds a fresh `voxx.json` object for a set of collections. A single
 * collection is written in the compact `content` form; two or more use the
 * `collections` array.
 *
 * @param site - Site metadata.
 * @param collections - Collections to declare.
 * @param features - Feature overrides to emit, or `undefined` to omit the block.
 */
export function buildVoxxJson(
  site: SiteMeta,
  collections: readonly PlannedCollection[],
  features?: Partial<FeatureFlags>,
): RawConfig {
  const first = collections[0]!;
  const out: RawConfig = {
    $schema: SCHEMA_REF,
    site: {
      title: site.title,
      description: site.description,
      url: site.url,
      locale: site.locale,
    },
  };

  if (collections.length === 1) {
    out["content"] = {
      type: first.type,
      dir: first.dir,
      basePath: first.basePath,
      drafts: false,
    };
  } else {
    out["collections"] = collections.map((c) => ({
      name: c.name,
      type: c.type,
      dir: c.dir,
      basePath: c.basePath,
      drafts: false,
    }));
  }

  out["theme"] = {
    preset: "default",
    css: null,
    codeTheme: "github-light github-dark",
  };

  if (features && Object.keys(features).length > 0) {
    const block: Partial<Record<FeatureKey, boolean>> = {};
    for (const key of FEATURE_KEYS) {
      if (features[key] !== undefined) block[key] = features[key];
    }
    out["features"] = block;
  }

  out["seo"] = {
    openGraph: true,
    twitter: null,
    jsonLd: true,
    defaultImage: null,
  };

  return out;
}

/** Spec for a single collection appended to an existing config. */
export interface AddSpec {
  readonly type: ContentType;
  readonly name?: string;
  readonly dir?: string;
  readonly base?: string;
}

/** Result of planning an appended collection against an existing config. */
export type AddPlan =
  | {
      readonly ok: true;
      readonly out: RawConfig;
      readonly collection: PlannedCollection;
    }
  | { readonly ok: false; readonly message: string };

function resolveExisting(raw: RawConfig): PlannedCollection[] {
  const rawCollections = Array.isArray(raw["collections"])
    ? (raw["collections"] as CollectionInput[])
    : [];
  const rawContent = (raw["content"] ?? undefined) as
    | CollectionInput
    | undefined;

  if (rawCollections.length > 0) {
    return rawCollections.map(resolveCollectionDefaults);
  }
  return [
    {
      name: rawContent?.type ?? DEFAULT_CONFIG.content.type,
      type: rawContent?.type ?? DEFAULT_CONFIG.content.type,
      dir: rawContent?.dir ?? DEFAULT_CONFIG.content.dir,
      basePath: rawContent?.basePath ?? DEFAULT_CONFIG.content.basePath,
    },
  ];
}

/**
 * Plans appending one collection to an existing raw config, migrating the
 * compact `content` form into a `collections` array when needed. Enforces
 * unique name, dir, and base path against the existing collections.
 *
 * @param raw - Parsed `voxx.json` object.
 * @param spec - The collection to append.
 */
export function planAddCollection(raw: RawConfig, spec: AddSpec): AddPlan {
  const existing = resolveExisting(raw);
  const first = existing[0]!;

  const name = spec.name ?? spec.type;
  const dir = spec.dir ?? `content/${name}`;
  const basePath = normalizeBase(spec.base ?? `/${name}`);

  if (existing.some((c) => c.name === name)) {
    return {
      ok: false,
      message: `Collection "${name}" already exists — defined: ${existing
        .map((c) => c.name)
        .join(", ")}. Pass --name <other>.`,
    };
  }
  const dupBase = existing.find((c) => c.basePath === basePath);
  if (dupBase) {
    return {
      ok: false,
      message: `Base path "${basePath}" is already used by collection "${dupBase.name}" — pass --base <path>.`,
    };
  }
  const dupDir = existing.find((c) => c.dir === dir);
  if (dupDir) {
    return {
      ok: false,
      message: `Content dir "${dir}" is already used by collection "${dupDir.name}" — pass --dir <dir>.`,
    };
  }

  const collection: PlannedCollection = {
    name,
    type: spec.type,
    dir,
    basePath,
  };
  const next = { ...collection, drafts: false };
  const rawCollections = Array.isArray(raw["collections"])
    ? (raw["collections"] as RawConfig[])
    : [];

  if (rawCollections.length > 0) {
    return {
      ok: true,
      out: { ...raw, collections: [...rawCollections, next] },
      collection,
    };
  }

  const rawContent = (raw["content"] ?? undefined) as
    | CollectionInput
    | undefined;
  const migrated: Record<string, unknown> = {
    name: first.name,
    ...(rawContent ?? {}),
  };
  const reResolved = resolveCollectionDefaults(migrated as CollectionInput);
  if (reResolved.dir !== first.dir) migrated["dir"] = first.dir;
  if (reResolved.basePath !== first.basePath) {
    migrated["basePath"] = first.basePath;
  }

  const collections = [migrated, next];
  const out: RawConfig = {};
  let inserted = false;
  for (const [key, value] of Object.entries(raw)) {
    if (key === "content" || key === "collections") {
      if (!inserted) {
        out["collections"] = collections;
        inserted = true;
      }
      continue;
    }
    out[key] = value;
  }
  if (!inserted) out["collections"] = collections;

  return { ok: true, out, collection };
}
