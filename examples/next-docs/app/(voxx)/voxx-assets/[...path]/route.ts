import {
  loadConfig,
  serveContentAsset,
  type VoxxConfig,
} from "@prudentbird/voxx-core";

/**
 * Serves the files that live in an `assets/` directory next to the Markdown
 * sources (images, fonts, downloads, …). Rendered posts reference them under
 * `/voxx-assets/…`; this handler maps those URLs back onto the content
 * directories declared in `voxx.json`.
 *
 * Deliberately not pinned with `dynamic = "force-static"`: the handler reads
 * `request.url`, so a prerendered instance would answer every path with the
 * same response.
 */
// A page can reference dozens of images; parse `voxx.json` once instead of
// per request. Development bypasses the cache so config edits apply live.
let cachedConfig: Promise<VoxxConfig> | undefined;

function getConfig(): Promise<VoxxConfig> {
  if (process.env.NODE_ENV === "development") return loadConfig();
  return (cachedConfig ??= loadConfig());
}

export async function GET(request: Request) {
  const response = await serveContentAsset(new URL(request.url).pathname, {
    config: await getConfig(),
  });
  return response ?? new Response(null, { status: 404 });
}
