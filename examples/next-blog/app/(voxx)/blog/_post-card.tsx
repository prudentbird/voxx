import Link from "next/link";
import type { PostMeta, VoxxConfig } from "@prudentbird/voxx-core";
import { formatDate } from "@prudentbird/voxx-core";

export function PostCard({
  post,
  config,
}: {
  post: PostMeta;
  config: VoxxConfig;
}) {
  const basePath = config.content.basePath || "/";

  return (
    <li className="voxx-postcard">
      <Link href={post.url} className="voxx-postcard__link">
        <h2 className="voxx-postcard__title">{post.title}</h2>
        <p className="voxx-postcard__meta">
          <time dateTime={post.date}>
            {formatDate(post.date, config.site.locale)}
          </time>
          {config.features.readingTime ? (
            <span>{` · ${post.readingTimeMinutes} min read`}</span>
          ) : null}
        </p>
        {post.excerpt ? (
          <p className="voxx-postcard__excerpt">{post.excerpt}</p>
        ) : null}
      </Link>
      {config.features.tags && post.tags.length > 0 ? (
        <ul className="voxx-tags">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Link
                href={`${basePath}?tag=${encodeURIComponent(tag)}`}
                className="voxx-tag voxx-tag--link"
              >
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
