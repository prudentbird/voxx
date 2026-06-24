---
title: Theming
description: Voxx inherits your design tokens — and looks good without them.
---

Voxx ships **element-only** styles: prose, code blocks, the TOC, the docs
sidebar, the pager. It never styles your page chrome, and it never defines
your design tokens — it _reads_ them.

## Token inheritance

Every color in `voxx.css` reads a host token first and falls back to a
built-in default:

```css
.voxx-prose {
  color: var(--foreground, var(--voxx-fg));
}
```

- **Your app defines shadcn-style tokens** (`--background`, `--foreground`,
  `--border`, `--primary`, …) — Voxx matches your design automatically.
  Restyle every page at once by editing your `globals.css`.
- **It doesn't** — Voxx's own light/dark fallbacks keep things looking good.
  `voxx init` detects this case and drops in `voxx-globals.css`, a
  copy-from token set you can grow into.

Dark mode follows the shadcn convention: a `.dark` class on an ancestor
wins, `prefers-color-scheme` covers the rest.

## The stylesheet

The scaffolded layout imports the stylesheet like any other file:

```tsx
import "@prudentbird/voxx-core/theme/voxx.css";
```

(`voxx init` copies it into your app's `_voxx/` folder instead, so you can
edit it line by line; `voxx build` ships it under `dist/_voxx/`.) All
selectors are flat, prefixed classes — `.voxx-prose`, `.voxx-toc`,
`.voxx-nav`, `.voxx-pager` — easy to override from your own CSS, no
specificity battles.

## Code highlighting

Code blocks are highlighted at build time by [Shiki](https://shiki.style).
`theme.codeTheme` takes one theme, or a light/dark pair that switches with
your site's mode:

```jsonc
{ "theme": { "codeTheme": "vitesse-light vitesse-dark" } }
```

Any [Shiki theme name](https://shiki.style/themes) works. Because
highlighting happens at build time, no highlighter ships to the client.

## Custom stylesheet

To take over completely, point `theme.css` at your own file and import that
from your layout instead. The rendered markup is stable, semantic HTML with
the class names above — your stylesheet has everything it needs to hook
into.
