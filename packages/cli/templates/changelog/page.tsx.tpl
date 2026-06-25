import type { Metadata } from "next";
import { getConfig, getPostsPage, listPosts } from "./_data";
import { ReleaseItem } from "./_release-item";
import { ReleaseStream } from "./_release-stream";

const PER_BATCH = 10;

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  return {
    title: config.site.title,
    description: config.site.description,
  };
}

export default async function ChangelogPage() {
  const [{ total }, initial, config] = await Promise.all([
    listPosts(),
    getPostsPage(0, PER_BATCH),
    getConfig(),
  ]);
  const basePath = config.content.basePath || "/changelog";

  return (
    <main className="voxx voxx-index">
      <header className="voxx-index__header">
        <h1>{config.site.title}</h1>
        {config.site.description ? (
          <p className="voxx-index__desc">{config.site.description}</p>
        ) : null}
      </header>
      {total === 0 ? (
        <div className="voxx-empty">
          <p>No releases yet.</p>
          <p>
            Add a Markdown file named for the version (e.g. <code>1.0.0.md</code>)
            to your content folder.
          </p>
        </div>
      ) : (
        <ReleaseStream
          initialCount={initial.length}
          total={total}
          perBatch={PER_BATCH}
          endpoint={`${basePath}/releases`}
          config={config}
        >
          {initial.map((post) => (
            <ReleaseItem key={post.slug} post={post} config={config} />
          ))}
        </ReleaseStream>
      )}
    </main>
  );
}
