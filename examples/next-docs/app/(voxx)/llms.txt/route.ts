import { renderLlmsTxt } from "@prudentbird/voxx-core";
import { getConfig, listPosts } from "../docs/_data";

export async function GET() {
  const [{ posts }, config] = await Promise.all([listPosts(), getConfig()]);
  return new Response(renderLlmsTxt(posts, config), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
