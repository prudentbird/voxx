import { getConfig, listPosts } from "../docs/_data";
import { renderLlmsTxt } from "@prudentbird/voxx-core";
import { buildAgentLlmsSection } from "~/lib/agent-docs";

export async function GET() {
  const [{ posts }, config] = await Promise.all([listPosts(), getConfig()]);
  const body = `${renderLlmsTxt(posts, config).trimEnd()}\n\n${buildAgentLlmsSection()}`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      Vary: "Accept, Accept-Encoding",
    },
  });
}
