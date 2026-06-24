import { renderRss } from "@voxx/core";
import { getConfig, getPosts } from "{{DATA_IMPORT}}";

export async function GET() {
  const [posts, config] = await Promise.all([getPosts(), getConfig()]);
  return new Response(renderRss(posts, config), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
