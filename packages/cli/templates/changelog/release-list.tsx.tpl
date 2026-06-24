import { formatDate } from "@voxx/core";
import type { Post, VoxxConfig } from "@voxx/core";

export function ReleaseList({
  posts,
  config,
}: {
  posts: Post[];
  config: VoxxConfig;
}) {
  if (posts.length === 0) {
    return (
      <div className="voxx-empty">
        <p>No releases yet.</p>
        <p>
          Add a Markdown file named for the version (e.g. <code>1.0.0.md</code>)
          to your content folder.
        </p>
      </div>
    );
  }

  return (
    <div className="voxx-releases">
      {posts.map((post) => (
        <section key={post.slug} id={post.slug} className="voxx-release">
          <header className="voxx-release__header">
            <h2 className="voxx-release__version">
              <a href={`#${post.slug}`}>{post.version ? `v${post.version}` : post.title}</a>
            </h2>
            <time dateTime={post.date}>{formatDate(post.date, config.site.locale)}</time>
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
