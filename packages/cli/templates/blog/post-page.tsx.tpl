import type { Post, VoxxConfig } from "@prudentbird/voxx-core";
import Link from "next/link";
import { OnThisPage } from "./on-this-page";
import { formatDate } from "@prudentbird/voxx-core";

export function PostPage({
  post,
  config,
}: {
  post: Post;
  config: VoxxConfig;
}) {
  const showToc = config.features.toc && post.toc.length > 0;

  return (
    <div className="voxx voxx-layout">
      <article className="voxx-article">
        <Link href={config.content.basePath || "/"} className="voxx-article__back">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 12 6 8l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          All posts
        </Link>
        <header className="voxx-article__header">
          <h1>{post.title}</h1>
          <p className="voxx-article__meta">
            <time dateTime={post.date}>{formatDate(post.date, config.site.locale)}</time>
            {config.features.readingTime ? (
              <span>{` · ${post.readingTimeMinutes} min read`}</span>
            ) : null}
          </p>
          {post.authors.length > 0 ? (
            <p className="voxx-article__authors">
              By{" "}
              {post.authors.map((author, i) => (
                <span key={author.name}>
                  {i > 0 ? ", " : ""}
                  {author.url ? (
                    <a className="voxx-article__author" href={author.url}>
                      {author.name}
                    </a>
                  ) : (
                    author.name
                  )}
                </span>
              ))}
            </p>
          ) : null}
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
