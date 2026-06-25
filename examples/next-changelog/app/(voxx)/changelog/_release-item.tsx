import { formatDate } from "@prudentbird/voxx-core";
import type { VoxxConfig } from "@prudentbird/voxx-core";

/** The minimal release shape the timeline renders — server posts and the
 * client stream endpoint both satisfy it. */
export interface StreamRelease {
  slug: string;
  version?: string;
  title: string;
  date: string;
  html: string;
}

export function ReleaseItem({
  post,
  config,
}: {
  post: StreamRelease;
  config: VoxxConfig;
}) {
  return (
    <section id={post.slug} className="voxx-release">
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
  );
}
