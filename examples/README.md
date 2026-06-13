# Voxx examples

Each example is scaffolded with `voxx init <preset>` and kept runnable as a
workspace package.

| Example | Preset | Setup |
| --- | --- | --- |
| [next-blog](./next-blog) | blog | Next.js App Router |
| [next-changelog](./next-changelog) | changelog | Next.js App Router |
| [next-docs](./next-docs) | docs | Next.js App Router |
| [static-blog](./static-blog) | blog | `voxx build` static HTML |
| [static-changelog](./static-changelog) | changelog | `voxx build` static HTML |
| [static-docs](./static-docs) | docs | `voxx build` static HTML |

Run any of them from the repo root, e.g.:

```sh
pnpm install
pnpm --filter @examples/next-blog dev
pnpm --filter @examples/static-docs build
```
