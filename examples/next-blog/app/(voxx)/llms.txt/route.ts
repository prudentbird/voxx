import { humanize, renderLlmsTxtSections, sectionHeading } from "@prudentbird/voxx-core";
import { getConfig, listCollections } from "../_voxx/data";
export const dynamic = "force-static";
export async function GET() {
  const [collections, config] = await Promise.all([listCollections(), getConfig()]);
  const sections = collections.map(({ collection, posts }) => ({
    heading: collections.length > 1
      ? humanize(collection.name)
      : sectionHeading(collection.type),
    posts,
  }));
  return new Response(renderLlmsTxtSections(sections, config), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
