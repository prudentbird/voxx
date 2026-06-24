import { formatDate } from "@prudentbird/voxx-core";
import type { Post, VoxxConfig } from "@prudentbird/voxx-core";

export function ReleaseList({
  posts,
  config,
}: {
  posts: Post[];
  config: VoxxConfig;
}) {
  if (posts.length === 0) {
    return <p className="voxx-empty">No releases yet.</p>;
  }

  return (
    <div className="voxx-releases">
      {posts.map((post) => (
        <section key={post.slug} id={post.slug} className="voxx-release">
          <header className="voxx-release__header">
            <h2 className="voxx-release__version">
              <a href={`#${post.slug}`}>
                {post.version ? `v${post.version}` : post.title}
              </a>
            </h2>
            <time dateTime={post.date}>
              {formatDate(post.date, config.site.locale)}
            </time>
          </header>
          <div
            className="voxx-prose"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
        </section>
      ))}
    </div>
  );
}
