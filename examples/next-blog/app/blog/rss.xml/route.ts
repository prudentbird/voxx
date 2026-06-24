import { renderRss } from "@prudentbird/voxx-core";
import { getConfig, getPosts } from "../_voxx/data";

export async function GET() {
  const [posts, config] = await Promise.all([getPosts(), getConfig()]);
  return new Response(renderRss(posts, config), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
