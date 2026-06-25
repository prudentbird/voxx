import { getPostsPage, listPosts } from "../_data";

const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const until = searchParams.get("until");

  let limit: number;
  if (until) {
    // Deep link: return everything from `offset` up to and including `until`,
    // so a release far down the timeline loads in one request.
    const { posts } = await listPosts();
    const index = posts.findIndex((post) => post.slug === until);
    if (index < 0) return Response.json([]);
    limit = Math.max(0, index + 1 - offset);
  } else {
    limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(searchParams.get("limit")) || 10),
    );
  }

  const posts = await getPostsPage(offset, limit);
  return Response.json(
    posts.map((post) => ({
      slug: post.slug,
      version: post.version,
      title: post.title,
      date: post.date,
      html: post.html,
    })),
  );
}
