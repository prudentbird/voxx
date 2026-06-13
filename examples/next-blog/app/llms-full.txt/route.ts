import { renderLlmsFull } from "@prudentbird/voxx-core";
import { getConfig, getPosts } from "../blog/_voxx/data";

export async function GET() {
  const [posts, config] = await Promise.all([getPosts(), getConfig()]);
  return new Response(renderLlmsFull(posts, config), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
