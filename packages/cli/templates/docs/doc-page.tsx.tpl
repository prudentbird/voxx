import Link from "next/link";
import type { Post, VoxxConfig } from "@prudentbird/voxx-core";
import { OnThisPage } from "./on-this-page";

export function DocPage({
  post,
  config,
  prev,
  next,
}: {
  post: Post;
  config: VoxxConfig;
  prev?: Post | null;
  next?: Post | null;
}) {
  const showToc = config.features.toc && post.toc.length > 0;

  return (
    <div className="voxx-layout">
      <article className="voxx-article">
        <header className="voxx-article__header">
          <h1>{post.title}</h1>
          {post.description ? (
            <p className="voxx-article__meta">{post.description}</p>
          ) : null}
        </header>
        <div
          className="voxx-prose"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
        {prev || next ? (
          <nav className="voxx-pager">
            {prev ? (
              <Link href={prev.url} className="voxx-pager__link">
                <span className="voxx-pager__label">Previous</span>
                <span className="voxx-pager__title">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={next.url}
                className="voxx-pager__link voxx-pager__link--next"
              >
                <span className="voxx-pager__label">Next</span>
                <span className="voxx-pager__title">{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
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
