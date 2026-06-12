---
title: Start a blog
description: Date-stamped markdown in, a reverse-chronological blog out.
---

From the root of your Next.js app:

```bash
npx voxx init
npm i @voxx/core
```

This writes:

```
voxx.json                        # config (autocompleted via JSON schema)
content/hello-world.md           # a sample post
app/blog/page.tsx                # the /blog index — lists all posts
app/blog/[slug]/page.tsx         # one post (+ metadata + static params)
app/blog/layout.tsx              # imports the Voxx stylesheet
app/blog/_voxx/*                 # data layer + components, yours to edit
app/sitemap.ts                   # sitemap.xml
app/robots.ts                    # robots.txt
app/blog/rss.xml/route.ts        # /blog/rss.xml
app/llms.txt/route.ts            # /llms.txt
app/llms-full.txt/route.ts       # /llms-full.txt
```

Set `site.url` in `voxx.json`, run your dev server, and open `/blog`.

## Write a post

Drop a `.md` file in your content folder, or let the CLI do it:

```bash
npx voxx new "Why files win"
```

That creates `content/2026-06-11-why-files-win.md` with frontmatter filled
in. The date prefix keeps posts sorted by creation date on disk and doubles
as the publish date when frontmatter doesn't say otherwise. Prefer flat
names? Pass `--flat`.

A post is just this:

```markdown
---
title: Why files win
description: A short summary used for SEO and excerpts.
date: 2026-06-11
tags: [craft, tooling]
---

Prose wants to be prose — not rows in a database. Just write and commit.
```

`title` is the only required field — see the
[frontmatter reference](/docs/writing/frontmatter) for everything else.

## What blogs get by default

Blogs ship with every feature flag on: table of contents, RSS, sitemap,
`llms.txt`, tags, and reading time. Turn any of them off in
[`voxx.json`](/docs/reference/configuration):

```jsonc
{ "features": { "readingTime": false } }
```

Posts are sorted newest-first. Drafts (`draft: true`) stay out of the index,
the feeds, and the sitemap until you flip them or build with drafts enabled.
