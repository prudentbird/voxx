import { type ContentType, defaultFeatures } from "@prudentbird/voxx-core";

/** Ordered list of toggleable feature keys, matching `voxx.json`'s `features`. */
export const FEATURE_KEYS = [
  "toc",
  "rss",
  "sitemap",
  "robots",
  "llmsTxt",
  "tags",
  "readingTime",
] as const;

/** A single toggleable feature in `voxx.json`'s `features` block. */
export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** Static metadata describing a feature for prompts and scaffolding. */
export interface FeatureDef {
  readonly key: FeatureKey;
  /** Human label shown in the feature multiselect. */
  readonly label: string;
  /** One-line hint shown beside the label. */
  readonly hint: string;
  /**
   * Whether enabling the feature scaffolds standalone Next route files.
   *
   * File-owning features (`rss`, `sitemap`, `robots`, `llmsTxt`) can be added
   * or removed by writing/deleting their route files. Runtime features
   * (`toc`, `tags`, `readingTime`) are gated only by the `voxx.json` flag and
   * read at render time by the scaffolded components.
   */
  readonly ownsFiles: boolean;
}

/** Registry of every toggleable feature, keyed by {@link FeatureKey}. */
export const FEATURES: Record<FeatureKey, FeatureDef> = {
  toc: {
    key: "toc",
    label: "Table of contents",
    hint: "on-page heading navigation",
    ownsFiles: false,
  },
  rss: {
    key: "rss",
    label: "RSS feed",
    hint: "rss.xml per collection",
    ownsFiles: true,
  },
  sitemap: {
    key: "sitemap",
    label: "Sitemap",
    hint: "sitemap.xml for crawlers",
    ownsFiles: true,
  },
  robots: {
    key: "robots",
    label: "robots.txt",
    hint: "crawler rules",
    ownsFiles: true,
  },
  llmsTxt: {
    key: "llmsTxt",
    label: "llms.txt",
    hint: "LLM-friendly content index",
    ownsFiles: true,
  },
  tags: {
    key: "tags",
    label: "Tags",
    hint: "per-post tag metadata",
    ownsFiles: false,
  },
  readingTime: {
    key: "readingTime",
    label: "Reading time",
    hint: "estimated minutes to read",
    ownsFiles: false,
  },
};

/** A resolved on/off state for every feature key. */
export type FeatureFlags = Record<FeatureKey, boolean>;

/**
 * Returns the recommended feature flags for a set of content types, enabling a
 * feature when *any* selected type's defaults recommend it. Mirrors core's
 * per-type defaults so the wizard's pre-checked options never drift.
 *
 * @param types - Content types being scaffolded.
 */
export function recommendedFlags(types: readonly ContentType[]): FeatureFlags {
  const flags = blankFlags();
  for (const type of types) {
    const defaults = defaultFeatures(type);
    for (const key of FEATURE_KEYS) {
      if (defaults[key]) flags[key] = true;
    }
  }
  return flags;
}

/** Returns a {@link FeatureFlags} object with every feature disabled. */
export function blankFlags(): FeatureFlags {
  return {
    toc: false,
    rss: false,
    sitemap: false,
    robots: false,
    llmsTxt: false,
    tags: false,
    readingTime: false,
  };
}

/**
 * Returns the feature keys that differ from a content type's defaults, so only
 * meaningful overrides are written to `voxx.json`.
 *
 * @param flags - Desired feature flags.
 * @param baseType - Content type whose defaults `voxx.json` will inherit.
 */
export function featureOverrides(
  flags: FeatureFlags,
  baseType: ContentType,
): Partial<FeatureFlags> {
  const defaults = defaultFeatures(baseType);
  const overrides: Partial<FeatureFlags> = {};
  for (const key of FEATURE_KEYS) {
    if (flags[key] !== defaults[key]) overrides[key] = flags[key];
  }
  return overrides;
}
