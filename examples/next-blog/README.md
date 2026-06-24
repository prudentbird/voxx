# Next.js blog example

A minimal Next.js app with a Voxx-powered blog at `/blog`, scaffolded with
`voxx init blog`. Markdown lives in `content/`, the routes and shell live in
`app/blog/`, and `voxx.json` configures the site.

```sh
pnpm install
pnpm dev      # open http://localhost:3000/blog
pnpm build
```

Add content with `npx voxx new "Title"` or by dropping markdown files into
`content/`.
