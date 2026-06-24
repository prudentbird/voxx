# Next.js changelog example

A minimal Next.js app with a Voxx-powered changelog at `/changelog`, scaffolded with
`voxx init changelog`. Markdown lives in `content/`, the routes and shell live in
`app/changelog/`, and `voxx.json` configures the site.

```sh
pnpm install
pnpm dev      # open http://localhost:3000/changelog
pnpm build
```

Add content with `npx @prudentbird/voxx new "Title"` or by dropping markdown files into
`content/`.
