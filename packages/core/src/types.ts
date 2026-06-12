export interface VoxxAuthor {
  name: string;
  url?: string;
}

export type ContentType = "blog" | "docs" | "changelog";

export interface CollectionConfig {
  name: string;
  type: ContentType;
  dir: string;
  basePath: string;
  drafts: boolean;
}

export interface VoxxConfig {
  site: {
    title: string;
    description: string;
    url: string;
    author?: VoxxAuthor;
    locale: string;
  };
  content: {
    type: ContentType;
    dir: string;
    basePath: string;
    drafts: boolean;
  };
  collections: CollectionConfig[];
  theme: {
    preset: "shadcn";
    css: string | null;
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
    twitter: string | null;
    jsonLd: boolean;
    defaultImage: string | null;
  };
}

export interface TocItem {
  id: string;
  text: string;
  depth: number;
}

export interface Post {
  slug: string;
  path: string[];
  url: string;
  title: string;
  description?: string;
  date: string;
  updated?: string;
  tags: string[];
  category?: string;
  order?: number;
  version?: string;
  draft: boolean;
  image?: string;
  author?: string;
  excerpt: string;
  readingTimeMinutes: number;
  html: string;
  toc: TocItem[];
  content: string;
}

export interface NavNode {
  title: string;
  url?: string;
  children: NavNode[];
}

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

export interface TwitterData {
  card: "summary_large_image";
  site?: string;
  creator?: string;
  title: string;
  description: string;
  images: string[];
}

export interface SeoData {
  title: string;
  description: string;
  canonical: string;
  openGraph?: OpenGraphData;
  twitter?: TwitterData;
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
