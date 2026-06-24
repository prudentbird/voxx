# Static blog example

A Voxx blog with no framework — markdown in, HTML/CSS out. Scaffolded with
`voxx init blog`. Markdown lives in `content/` and `voxx.json` configures
the site.

```sh
pnpm install
pnpm dev      # preview with a local server
pnpm build    # render static HTML to ./dist
```

Add content with `npx voxx new "Title"` or by dropping markdown files into
`content/`.
