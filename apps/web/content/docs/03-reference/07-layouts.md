---
title: Layouts
description: The shells Voxx scaffolds for docs, blog, and changelog in a Next.js app, and how to keep your app's chrome out of them.
---

Every preset ships a self-contained shell instead of nesting under your site's
navbar and footer. Docs get a sidebar that owns the whole viewport; blog and
changelog get a slim top bar. Either way the chrome is part of the scaffold, so
the surface looks finished the moment you run `voxx init`.

Everything on this page except the shells' anatomy is **Next.js-specific** —
layout nesting and root layouts are App Router concepts. Static builds
(`voxx build`) have no layout system to fight; skip to
[Static builds](#static-builds).

## The docs shell

Docs scaffold a sidebar layout and the client pieces that drive it:

```
app/docs/layout.tsx        # the shell: sidebar + content grid
app/docs/_voxx/
  sidebar-nav.tsx          # the page tree
  mobile-nav.tsx           # drawer behind the ☰ button on small screens
  theme-toggle.tsx         # light/dark, persisted to localStorage
```

The layout renders one grid — sidebar on the left, your page on the right:

```tsx
<div className="voxx voxx-docs">
  <aside className="voxx-docs__nav">
    <div className="voxx-docs__nav-inner">
      <div className="voxx-docs__nav-header">
        {" "}
        {/* logo / site title */}
        <MobileNav items={tree} title={config.site.title} />
        <Link href="/docs" className="voxx-docs__title">
          …
        </Link>
      </div>
      <SidebarNav items={tree} /> {/* the page tree */}
      <div className="voxx-docs__nav-footer">
        {" "}
        {/* pinned to the bottom */}
        <ThemeToggle />
      </div>
    </div>
  </aside>
  {children}
</div>
```

The slots are plain class names from the Voxx stylesheet, so you can put
anything in the header and footer — a logo component, a version picker, a
GitHub link. On screens under 768px the sidebar collapses into a sticky top
bar: the ☰ button opens the page tree in a drawer, and the footer contents
sit on the right.

## The blog and changelog shell

Blog and changelog don't need a page tree, so they scaffold a slimmer shell —
a sticky top bar over the content:

```
app/blog/layout.tsx              # the shell: title, RSS link, theme toggle
app/blog/_voxx/theme-toggle.tsx  # light/dark, persisted to localStorage
```

```tsx
<div className="voxx">
  <header className="voxx-header">
    <Link href="/blog" className="voxx-header__title">
      …
    </Link>
    <div className="voxx-header__actions">
      {" "}
      {/* right-aligned controls */}
      {/* RSS link, shown when features.rss is on */}
      <ThemeToggle />
    </div>
  </header>
  {children}
</div>
```

Same idea as the docs shell at a smaller scale: the title on the left links
back to the index, and `.voxx-header__actions` holds the right-aligned
controls — the RSS link (rendered when `features.rss` is on) and the theme
toggle. The slots are plain class names, so swap in whatever your site needs.
Changelog uses the identical bar; only the feed label differs.

## Your Next.js root layout wraps the shell

A Next.js segment layout always renders inside every layout above it. If
`app/layout.tsx` has a navbar and footer, they wrap `/docs` (or `/blog`, or
`/changelog`) too — there is no opt-out, and the surface ends up with two
competing chromes. This bites docs hardest, since the sidebar expects the full
viewport, but it applies to every preset.

Two ways to arrange this:

1. **Keep the root layout bare.** Put `<html>`, `<body>`, fonts, and
   providers in `app/layout.tsx` and nothing else; move your navbar and
   footer into a route group layout for the rest of the site:

   ```
   app/
   ├── layout.tsx           # html/body only — no chrome
   ├── (site)/
   │   ├── layout.tsx       # navbar + footer live here
   │   └── page.tsx         # /
   └── docs/
       └── layout.tsx       # the Voxx shell
   ```

   This works, but it's a convention — a navbar added to the root layout
   later leaks into the surface again.

2. **Multiple root layouts.** Delete the top-level `app/layout.tsx`
   entirely. Any layout without one above it becomes a root layout, so give
   each branch its own `<html>` and `<body>`:

   ```
   app/
   ├── (site)/
   │   ├── layout.tsx       # root layout #1: html/body + your chrome
   │   └── page.tsx         # /
   └── docs/
       └── layout.tsx       # root layout #2: html/body + the Voxx shell
   ```

   Now leakage is structurally impossible — the content branch has no shared
   ancestor with the rest of your app. The trade-off: navigating between
   `/` and `/docs` is a full page load instead of a client-side transition,
   and each root layout declares its own fonts and providers. Top-level
   files that aren't pages (`sitemap.ts`, `robots.ts`, route handlers) stay
   where they are; they don't need a layout.

This is how [voxx](https://voxx.prudentbird.com) itself is arranged — the
marketing page and these docs are separate root layouts.

## Static builds

`voxx build` ships the same shells with zero JavaScript. Docs render the
sidebar with your `site.title` in the header, a `<details>` dropdown for
navigation on the mobile bar, and dark mode that follows
`prefers-color-scheme`. Blog and changelog render the same top bar — title
link plus RSS — as part of the HTML. There's nothing to wire up; the chrome is
baked into the rendered output.
