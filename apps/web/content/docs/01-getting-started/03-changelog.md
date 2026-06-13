---
title: Start a changelog
description: Version-named files become a release timeline with stable anchors.
---

From the root of your Next.js app:

```bash
npx voxx init changelog
npm i @prudentbird/voxx-core
```

This writes:

```
voxx.json                        # config, with type: "changelog"
content/0.1.0.md                 # a sample release
app/changelog/page.tsx           # the timeline — all releases, one page
app/changelog/layout.tsx         # imports the Voxx stylesheet
app/changelog/_voxx/*            # the release list, yours to edit
app/changelog/rss.xml/route.ts   # /changelog/rss.xml — a release feed
app/llms.txt/route.ts            # /llms.txt
app/llms-full.txt/route.ts       # /llms-full.txt
```

Open `/changelog` for a single page of releases, newest first, each with a
stable anchor link you can share (`/changelog#1-4-0`).

## Cut a release

```bash
npx voxx new "1.4.0"
```

creates `content/1.4.0.md`, pre-dated today:

```markdown
---
title: v1.4.0
version: "1.4.0"
date: 2026-06-11
---

### Added

- Collections: mount a blog, docs, and changelog on one site.
```

The version comes from the filename (`1.4.0.md`, `v2.0.0-beta.1.md` both
work) or from `version:` in frontmatter — frontmatter wins. The body is
ordinary markdown; headings like `### Added` / `### Fixed` are a convention,
not a requirement.

## What changelogs get by default

Changelogs default to: RSS and `llms.txt` **on** (release feeds are useful);
table of contents, sitemap, tags, and reading time **off** —
one timeline page doesn't need them. Override anything in
[`voxx.json`](/docs/reference/configuration).
