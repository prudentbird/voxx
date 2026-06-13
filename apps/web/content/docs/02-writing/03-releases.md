---
title: Writing releases
description: Version files, anchors, and the conventions of a good changelog.
---

A changelog collection is a folder of release files. Each file is one
release; the page at the base path renders them all as a single timeline,
newest first.

```
content/changelog/
  1.4.0.md          → /changelog#1-4-0
  1.3.0.md          → /changelog#1-3-0
  v1.3.0-beta.1.md  → /changelog#v1-3-0-beta-1
```

## Naming releases

The version comes from the filename when it looks like one — `1.4.0.md`,
`v2.0.md`, `2.0.0-rc.1.md` all parse — or from frontmatter, which always
wins:

```markdown
---
title: The collections release
version: "1.4.0"
date: 2026-06-11
---

### Added

- Collections: mount a blog, docs, and changelog on one site.

### Fixed

- Order prefixes no longer leak into URLs.
```

Quote the version (`"1.4.0"`) so YAML doesn't read it as a number. `title`
is still required; if you have nothing better, `voxx new "1.4.0"` defaults
it to `v1.4.0`.

## Dates drive the timeline

Releases sort by `date`, newest first — version numbers name releases but
don't order them. Give every release an explicit date; "what shipped when"
is the whole point of a changelog.

## Anchors

Every release gets a stable anchor derived from its slug, so you can link
to `/changelog#1-4-0` from release tweets, commit messages, or upgrade
guides and the link keeps working as new releases land above it.

## Body conventions

The body is ordinary markdown. Grouping changes under `### Added`,
`### Changed`, `### Fixed`, and `### Removed` (_à la_
[Keep a Changelog](https://keepachangelog.com)) reads well in the timeline,
but Voxx doesn't enforce it — paragraphs, bullets, even images all render
fine.

If the changelog shares a site with other surfaces, see
[Collections](/docs/reference/collections).
