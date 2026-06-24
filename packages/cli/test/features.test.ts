import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, defaultFeatures } from "@prudentbird/voxx-core";
import {
  FEATURE_KEYS,
  FEATURES,
  blankFlags,
  featureOverrides,
  recommendedFlags,
} from "../src/features";

describe("feature registry", () => {
  it("covers exactly the core feature flags", () => {
    expect([...FEATURE_KEYS].sort()).toEqual(
      Object.keys(DEFAULT_CONFIG.features).sort(),
    );
  });

  it("describes every key", () => {
    for (const key of FEATURE_KEYS) {
      expect(FEATURES[key].label.length).toBeGreaterThan(0);
      expect(FEATURES[key].key).toBe(key);
    }
  });

  it("marks only standalone route features as file-owning", () => {
    const owning = FEATURE_KEYS.filter((k) => FEATURES[k].ownsFiles);
    expect(owning.sort()).toEqual(["llmsTxt", "robots", "rss", "sitemap"]);
  });
});

describe("recommendedFlags", () => {
  it("matches a single type's core defaults", () => {
    expect(recommendedFlags(["docs"])).toEqual({
      ...blankFlags(),
      ...defaultFeatures("docs"),
    });
  });

  it("unions recommendations across types", () => {
    const flags = recommendedFlags(["blog", "changelog"]);
    expect(flags.rss).toBe(true);
    expect(flags.tags).toBe(true);
    expect(flags.sitemap).toBe(true);
  });
});

describe("featureOverrides", () => {
  it("returns only flags that differ from the base type defaults", () => {
    const flags = { ...recommendedFlags(["blog"]), sitemap: false };
    expect(featureOverrides(flags, "blog")).toEqual({ sitemap: false });
  });

  it("returns nothing when flags match the defaults", () => {
    expect(featureOverrides(recommendedFlags(["docs"]), "docs")).toEqual({});
  });
});
