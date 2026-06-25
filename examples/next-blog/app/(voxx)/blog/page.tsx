import type { Metadata } from "next";
import { getConfig, listPosts } from "./_data";
import { PostCard } from "./_post-card";
import { PostStream } from "./_post-stream";

const PER_BATCH = 10;

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  return {
    title: config.site.title,
    description: config.site.description,
  };
}

type Props = {
  searchParams: Promise<{ tag?: string }>;
};

export default async function BlogIndex({ searchParams }: Props) {
  const { tag } = await searchParams;
  const [{ posts: initial, total }, config] = await Promise.all([
    listPosts({ tag, limit: PER_BATCH }),
    getConfig(),
  ]);
  const basePath = config.content.basePath || "/";
  const postsEndpoint = `${basePath === "/" ? "" : basePath}/posts`;

  return (
    <main className="voxx voxx-index">
      <header className="voxx-index__header">
        <h1>{config.site.title}</h1>
        {config.site.description ? (
          <p className="voxx-index__desc">{config.site.description}</p>
        ) : null}
        {tag ? (
          <p className="voxx-index__filter">
            Tagged <span className="voxx-tag">{tag}</span>
          </p>
        ) : null}
      </header>
      {total === 0 ? (
        <div className="voxx-empty">
          {tag ? (
            <p>No posts match this tag yet.</p>
          ) : (
            <>
              <p>No posts yet.</p>
              <p>
                Add a Markdown file to your content folder, or run{" "}
                <code>voxx new &quot;My post&quot;</code> to scaffold one.
              </p>
            </>
          )}
        </div>
      ) : (
        <PostStream
          key={tag ?? "all"}
          initialCount={initial.length}
          total={total}
          perBatch={PER_BATCH}
          endpoint={postsEndpoint}
          tag={tag}
          config={config}
        >
          {initial.map((post) => (
            <PostCard key={post.slug} post={post} config={config} />
          ))}
        </PostStream>
      )}
    </main>
  );
}
