import { serveContentAsset } from "@prudentbird/voxx-core";

/**
 * Serves the files that live in an `assets/` directory next to the Markdown
 * sources (images, fonts, downloads, …). Rendered posts reference them under
 * `/voxx-assets/…`; this handler maps those URLs back onto the content
 * directories declared in `voxx.json`.
 */
export async function GET(request: Request) {
  const response = await serveContentAsset(new URL(request.url).pathname);
  return response ?? new Response(null, { status: 404 });
}
