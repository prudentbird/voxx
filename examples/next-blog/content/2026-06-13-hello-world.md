---
title: Hello, world
description: Your very first Voxx post — edit or delete me.
date: 2026-06-13
tags: [getting-started]
category: General
---

Welcome to your new blog. This file is just markdown with a little YAML
frontmatter on top, so you can write a post in any editor and commit it like
code.

## Why JSON was the wrong surface

Configuration files are great for machines and miserable for writing. Prose
wants to be prose — headings, paragraphs, the occasional list:

- No database to run
- No admin UI to log into
- Just files you can grep, diff, and version

## One line, that's all

Voxx reads this file, parses the frontmatter, renders the markdown, and hands
your app clean data. Code blocks are highlighted automatically:

```ts
import { getPosts } from "@prudentbird/voxx-core";

const posts = await getPosts();
```

## A format that plays well with AI

Because every post is self-describing — explicit metadata, natural-language
body — both humans and agents can read and write them. Voxx can even emit an
`llms.txt` so models can discover your writing.

## Final thoughts

Edit `voxx.json` to configure the blog, drop more `.md` files next to this one,
and you're publishing. That's the whole idea.
