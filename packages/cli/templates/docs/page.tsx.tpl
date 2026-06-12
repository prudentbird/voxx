import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildNavTree, buildSeo } from "@voxx/core";
import { getConfig, getPost, getPosts } from "../_voxx/data";
import { toMetadata } from "../_voxx/metadata";
import { DocPage } from "../_voxx/doc-page";
import { SidebarNav } from "../_voxx/sidebar-nav";

type Params = { params: Promise<{ slug?: string[] }> };

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.path }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug = [] } = await params;
  const [post, config] = await Promise.all([
    getPost(slug.join("/")),
    getConfig(),
  ]);
  if (!post) return {};
  return toMetadata(buildSeo(post, config));
}

export default async function DocRoute({ params }: Params) {
  const { slug = [] } = await params;
  const [post, posts, config] = await Promise.all([
    getPost(slug.join("/")),
    getPosts(),
    getConfig(),
  ]);
  if (!post) notFound();

  const index = posts.findIndex((p) => p.url === post.url);
  const prev = index > 0 ? posts[index - 1] : null;
  const next = index >= 0 && index < posts.length - 1 ? posts[index + 1] : null;
  const seo = buildSeo(post, config);

  return (
    <div className="voxx voxx-docs">
      {config.seo.jsonLd && seo.jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.jsonLd) }}
        />
      ) : null}
      <aside className="voxx-docs__nav">
        <div className="voxx-docs__nav-inner">
          <SidebarNav items={buildNavTree(posts)} />
        </div>
      </aside>
      <DocPage post={post} config={config} prev={prev} next={next} />
    </div>
  );
}
