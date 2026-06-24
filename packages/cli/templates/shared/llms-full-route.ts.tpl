import { renderLlmsFull } from "@prudentbird/voxx-core";
import { getConfig, getPosts } from "{{DATA_IMPORT}}";

export async function GET() {
  const [posts, config] = await Promise.all([getPosts(), getConfig()]);
  return new Response(renderLlmsFull(posts, config), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
