import type { Post, VoxxConfig } from "@prudentbird/voxx-core";
import { OnThisPage } from "./on-this-page";
import { formatDate } from "@prudentbird/voxx-core";

export function PostPage({ post, config }: { post: Post; config: VoxxConfig }) {
  const showToc = config.features.toc && post.toc.length > 0;

  return (
    <div className="voxx voxx-layout">
      <article className="voxx-article">
        <header className="voxx-article__header">
          <h1>{post.title}</h1>
          <p className="voxx-article__meta">
            <time dateTime={post.date}>
              {formatDate(post.date, config.site.locale)}
            </time>
            {config.features.readingTime ? (
              <span>{` · ${post.readingTimeMinutes} min read`}</span>
            ) : null}
          </p>
        </header>
        <div
          className="voxx-prose"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </article>

      {showToc ? (
        <aside className="voxx-aside">
          <div className="voxx-aside__inner">
            <OnThisPage toc={post.toc} />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
