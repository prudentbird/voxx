import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildSeo, serializeJsonLd } from "@prudentbird/voxx-core";
import { getConfig, getPost, getReachablePosts } from "../_voxx/data";
import { PostPage } from "../_voxx/post-page";
import { toMetadata } from "../_voxx/metadata";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getReachablePosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [post, config] = await Promise.all([getPost(slug), getConfig()]);
  if (!post) return {};
  return toMetadata(buildSeo(post, config));
}

export default async function PostRoute({ params }: Params) {
  const { slug } = await params;
  const [post, config] = await Promise.all([getPost(slug), getConfig()]);
  if (!post) notFound();

  const seo = buildSeo(post, config);

  return (
    <>
      {config.seo.jsonLd && seo.jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(seo.jsonLd) }}
        />
      ) : null}
      <PostPage post={post} config={config} />
    </>
  );
}
