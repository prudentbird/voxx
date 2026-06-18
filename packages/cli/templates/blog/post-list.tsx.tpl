import Link from "next/link";
import type { Post, VoxxConfig } from "@prudentbird/voxx-core";
import { formatDate } from "@prudentbird/voxx-core";

export function PostList({
  posts,
  config,
}: {
  posts: Post[];
  config: VoxxConfig;
}) {
  if (posts.length === 0) {
    return (
      <div className="voxx-empty">
        <p>No posts yet.</p>
        <p>
          Add a Markdown file to your content folder, or run{" "}
          <code>voxx new &quot;My post&quot;</code> to scaffold one.
        </p>
      </div>
    );
  }

  return (
    <ul className="voxx-postlist">
      {posts.map((post) => (
        <li key={post.slug} className="voxx-postcard">
          <Link href={post.url} className="voxx-postcard__link">
            <h2 className="voxx-postcard__title">{post.title}</h2>
            <p className="voxx-postcard__meta">
              <time dateTime={post.date}>{formatDate(post.date, config.site.locale)}</time>
              {config.features.readingTime ? (
                <span>{` · ${post.readingTimeMinutes} min read`}</span>
              ) : null}
            </p>
            {post.excerpt ? (
              <p className="voxx-postcard__excerpt">{post.excerpt}</p>
            ) : null}
            {config.features.tags && post.tags.length > 0 ? (
              <ul className="voxx-tags">
                {post.tags.map((tag) => (
                  <li key={tag} className="voxx-tag">
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
