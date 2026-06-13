/** Author metadata attached to a site or post. */
export interface VoxxAuthor {
  name: string;
  url?: string;
}

/** The rendering mode for a content collection. */
export type ContentType = "blog" | "docs" | "changelog";

/** A resolved content collection with all defaults applied. */
export interface CollectionConfig {
  name: string;
  type: ContentType;
  /** Filesystem path to the content directory. */
  dir: string;
  /** URL prefix for all posts in this collection. */
  basePath: string;
  /** Whether draft posts are included by default. */
  drafts: boolean;
}

/** Resolved Voxx configuration merged from `voxx.json` and defaults. */
export interface VoxxConfig {
  site: {
    title: string;
    description: string;
    /** Canonical origin, e.g. `https://example.com`. */
    url: string;
    author?: VoxxAuthor;
    /** BCP 47 locale tag, e.g. `en-US`. */
    locale: string;
  };
  /** Primary content collection (mirrors `collections[0]`). */
  content: {
    type: ContentType;
    dir: string;
    basePath: string;
    drafts: boolean;
  };
  collections: CollectionConfig[];
  theme: {
    preset: "shadcn";
    /** Path to a custom CSS file, or `null` to use the preset default. */
    css: string | null;
    /** One or two Shiki theme names separated by a space (light dark). */
    codeTheme: string;
  };
  features: {
    toc: boolean;
    rss: boolean;
    sitemap: boolean;
    llmsTxt: boolean;
    tags: boolean;
    readingTime: boolean;
  };
  seo: {
    openGraph: boolean;
    /** Twitter/X handle including `@`, or `null` to omit. */
    twitter: string | null;
    jsonLd: boolean;
    /** Fallback OG image path relative to the site root. */
    defaultImage: string | null;
  };
}

/** A single entry in a page's table of contents. */
export interface TocItem {
  id: string;
  text: string;
  /** Heading level — `2` for `h2`, `3` for `h3`. */
  depth: number;
}

/** A fully processed content post ready to render. */
export interface Post {
  /** Final path segment(s), e.g. `["getting-started", "install"]`. */
  slug: string;
  path: string[];
  /** Absolute URL path, e.g. `/blog/my-post`. */
  url: string;
  title: string;
  description?: string;
  /** ISO 8601 publish date. */
  date: string;
  /** ISO 8601 last-modified date. */
  updated?: string;
  tags: string[];
  category?: string;
  /** Sort order within the parent directory (docs only). */
  order?: number;
  /** Semver string extracted from the filename or frontmatter (changelog only). */
  version?: string;
  draft: boolean;
  image?: string;
  author?: string;
  /** Plain-text excerpt derived from the first 180 characters of content. */
  excerpt: string;
  readingTimeMinutes: number;
  /** Rendered HTML string. */
  html: string;
  toc: TocItem[];
  /** Raw Markdown source. */
  content: string;
}

/** A node in the sidebar navigation tree. */
export interface NavNode {
  title: string;
  /** Present on leaf nodes; absent on category nodes. */
  url?: string;
  children: NavNode[];
}

/** Open Graph article metadata. */
export interface OpenGraphData {
  title: string;
  description: string;
  url: string;
  type: "article";
  siteName: string;
  locale: string;
  images: string[];
  publishedTime?: string;
  modifiedTime?: string;
  authors: string[];
  tags: string[];
}

/** Twitter card metadata. */
export interface TwitterData {
  card: "summary_large_image";
  site?: string;
  creator?: string;
  title: string;
  description: string;
  images: string[];
}

/** Aggregated SEO metadata for a single page. */
export interface SeoData {
  title: string;
  description: string;
  canonical: string;
  openGraph?: OpenGraphData;
  twitter?: TwitterData;
  /** JSON-LD structured data object — serialize with `serializeJsonLd`. */
  jsonLd?: Record<string, unknown>;
}

export const DEFAULT_CONFIG: VoxxConfig = {
  site: {
    title: "Blog",
    description: "",
    url: "",
    locale: "en-US",
  },
  content: {
    type: "blog",
    dir: "content/blog",
    basePath: "/blog",
    drafts: false,
  },
  collections: [
    {
      name: "blog",
      type: "blog",
      dir: "content/blog",
      basePath: "/blog",
      drafts: false,
    },
  ],
  theme: {
    preset: "shadcn",
    css: null,
    codeTheme: "github-light github-dark",
  },
  features: {
    toc: true,
    rss: true,
    sitemap: true,
    llmsTxt: true,
    tags: true,
    readingTime: true,
  },
  seo: {
    openGraph: true,
    twitter: null,
    jsonLd: true,
    defaultImage: null,
  },
};
