import { Schema } from "effect";

const DateLike = Schema.transform(
  Schema.Union(Schema.String, Schema.DateFromSelf),
  Schema.String,
  {
    strict: false,
    decode: (value) => (value instanceof Date ? value.toISOString() : value),
    encode: (value) => value,
  },
);

const optionalString = Schema.optionalWith(Schema.String, { nullable: true });

export const Frontmatter = Schema.Struct({
  title: Schema.String,
  description: optionalString,
  date: Schema.optionalWith(DateLike, { nullable: true }),
  updated: Schema.optionalWith(DateLike, { nullable: true }),
  slug: optionalString,
  tags: Schema.optionalWith(Schema.Array(Schema.String), {
    default: () => [],
    nullable: true,
  }),
  category: optionalString,
  order: Schema.optionalWith(Schema.Number, { nullable: true }),
  version: optionalString,
  draft: Schema.optionalWith(Schema.Boolean, {
    default: () => false,
    nullable: true,
  }),
  image: optionalString,
  author: optionalString,
  excerpt: optionalString,
});

export type FrontmatterData = typeof Frontmatter.Type;

export const ConfigInput = Schema.Struct({
  $schema: Schema.optional(Schema.String),
  site: Schema.Struct({
    title: Schema.String,
    description: Schema.optional(Schema.String),
    url: Schema.String,
    titleHref: Schema.optional(Schema.String),
    author: Schema.optional(
      Schema.Struct({
        name: Schema.String,
        url: Schema.optional(Schema.String),
      }),
    ),
    locale: Schema.optional(Schema.String),
  }),
  content: Schema.optional(
    Schema.Struct({
      type: Schema.optional(Schema.Literal("blog", "docs", "changelog")),
      dir: Schema.optional(Schema.String),
      basePath: Schema.optional(Schema.String),
      drafts: Schema.optional(Schema.Boolean),
    }),
  ),

  collections: Schema.optional(
    Schema.Array(
      Schema.Struct({
        name: Schema.optional(Schema.String),
        type: Schema.optional(Schema.Literal("blog", "docs", "changelog")),
        dir: Schema.optional(Schema.String),
        basePath: Schema.optional(Schema.String),
        drafts: Schema.optional(Schema.Boolean),
      }),
    ),
  ),
  theme: Schema.optional(
    Schema.Struct({
      preset: Schema.optional(Schema.Literal("shadcn")),
      css: Schema.optional(Schema.NullOr(Schema.String)),
      codeTheme: Schema.optional(Schema.String),
    }),
  ),
  features: Schema.optional(
    Schema.Struct({
      toc: Schema.optional(Schema.Boolean),
      rss: Schema.optional(Schema.Boolean),
      sitemap: Schema.optional(Schema.Boolean),
      llmsTxt: Schema.optional(Schema.Boolean),
      tags: Schema.optional(Schema.Boolean),
      readingTime: Schema.optional(Schema.Boolean),
    }),
  ),
  seo: Schema.optional(
    Schema.Struct({
      openGraph: Schema.optional(Schema.Boolean),
      twitter: Schema.optional(Schema.NullOr(Schema.String)),
      jsonLd: Schema.optional(Schema.Boolean),
      defaultImage: Schema.optional(Schema.NullOr(Schema.String)),
    }),
  ),
});

export type VoxxConfigInput = typeof ConfigInput.Type;
