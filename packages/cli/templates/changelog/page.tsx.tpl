import type { Metadata } from "next";
import { getConfig, getPosts } from "./_voxx/data";
import { ReleaseList } from "./_voxx/release-list";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  return {
    title: config.site.title,
    description: config.site.description,
  };
}

export default async function ChangelogPage() {
  const [posts, config] = await Promise.all([getPosts(), getConfig()]);

  return (
    <main className="voxx voxx-index">
      <header className="voxx-index__header">
        <h1>{config.site.title}</h1>
        {config.site.description ? (
          <p className="voxx-index__desc">{config.site.description}</p>
        ) : null}
      </header>
      <ReleaseList posts={posts} config={config} />
    </main>
  );
}
