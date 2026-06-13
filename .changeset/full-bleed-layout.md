---
"@prudentbird/voxx-core": minor
---

Rework the theme layout to read width and full-bleed docs. The docs layout drops its fixed `max-width` and renders edge-to-edge: the sidebar nav sits at the far left, the table of contents at the far right, and the article is centered in the space between. Blog articles, changelog releases, and docs content now share a 45rem (720px) reading column, and the `.voxx-article` margin reset is scoped to `.voxx-layout` so the docs column can center independently.
