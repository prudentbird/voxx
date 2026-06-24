# Next.js docs example

A minimal Next.js app with a Voxx-powered docs at `/docs`, scaffolded with
`voxx init docs`. Markdown lives in `content/`, the routes and shell live in
`app/docs/`, and `voxx.json` configures the site.

```sh
pnpm install
pnpm dev      # open http://localhost:3000/docs
pnpm build
```

Add content with `npx @prudentbird/voxx new "Title"` or by dropping markdown files into
`content/`.
