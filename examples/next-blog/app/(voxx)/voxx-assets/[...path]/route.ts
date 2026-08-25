import { serveContentAsset } from "@prudentbird/voxx-core";

/**
 * Serves the non-Markdown files that live next to the Markdown sources
 * (images, fonts, downloads, …). Rendered posts reference them under
 * `/voxx-assets/…`; this handler maps those URLs back onto the content
 * directories declared in `voxx.json`.
 *
 * Deliberately not pinned with `dynamic = "force-static"`: the handler reads
 * `request.url`, so a prerendered instance would answer every path with the
 * same response.
 */
export async function GET(request: Request) {
  const response = await serveContentAsset(new URL(request.url).pathname);
  return response ?? new Response(null, { status: 404 });
}
