import { listPosts } from "{{DATA_IMPORT}}";

const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit")) || 10),
  );
  const tag = searchParams.get("tag") ?? undefined;
  const { posts } = await listPosts({ tag, offset, limit });
  return Response.json(posts);
}
