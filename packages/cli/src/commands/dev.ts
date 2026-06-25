import { watch, type FSWatcher } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { parseArgs } from "node:util";
import { loadConfig } from "@prudentbird/voxx-core";
import { c, exists, log } from "../util";
import { buildSite } from "./build";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
};

export interface DevHandle {
  port: number;
  close: () => Promise<void>;
}

export async function serveFile(outDir: string, urlPath: string) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const safe = normalize(decoded).replace(/^(\.\.[\\/])+/, "");
  const candidates = safe.endsWith("/")
    ? [join(safe, "index.html")]
    : [safe, join(safe, "index.html")];
  for (const rel of candidates) {
    const path = join(outDir, rel);
    if (!path.startsWith(outDir)) continue;
    try {
      const body = await readFile(path);
      const type =
        MIME[extname(path).toLowerCase()] ?? "application/octet-stream";
      return { status: 200, type, body };
    } catch {
      continue;
    }
  }
  return {
    status: 404,
    type: "text/html; charset=utf-8",
    body: Buffer.from("<h1>404</h1><p>Not found.</p>"),
  };
}

export async function dev(argv: string[]): Promise<DevHandle | undefined> {
  const { values } = parseArgs({
    args: argv,
    options: {
      port: { type: "string" },
      drafts: { type: "boolean" },
    },
    allowPositionals: true,
  });

  const cwd = process.cwd();
  if (!(await exists(join(cwd, "voxx.json")))) {
    log.error("No voxx.json found. Run `voxx init` first.");
    process.exitCode = 1;
    return;
  }

  const port = Number(values.port ?? 4321);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    log.error(`Invalid port "${values.port}".`);
    process.exitCode = 1;
    return;
  }

  const includeDrafts = values.drafts ?? true;
  const outDir = await mkdtemp(join(tmpdir(), "voxx-dev-"));

  let building = Promise.resolve();
  let dirty = false;
  const rebuild = (label: string) => {
    building = building.then(async () => {
      try {
        const started = Date.now();
        const result = await buildSite({ cwd, outDir, includeDrafts });
        log.success(
          `${label} — ${result.pageCount} pages in ${Date.now() - started}ms`,
        );
      } catch (err) {
        log.error(err instanceof Error ? err.message : String(err));
      }
    });
    return building;
  };

  await rebuild("Built");

  const watchers: FSWatcher[] = [];
  const watchPath = (path: string, recursive: boolean) => {
    try {
      const watcher = watch(path, { recursive }, () => {
        if (dirty) return;
        dirty = true;
        setTimeout(() => {
          dirty = false;
          void rebuild("Rebuilt");
        }, 150);
      });
      watchers.push(watcher);
    } catch {
      log.warn(`Could not watch ${path}.`);
    }
  };

  const config = await loadConfig({ cwd });
  watchPath(join(cwd, "voxx.json"), false);
  for (const collection of config.collections) {
    if (await exists(collection.dir)) watchPath(collection.dir, true);
  }

  const server = createServer((req, res) => {
    building
      .then(() => serveFile(outDir, req.url ?? "/"))
      .then(({ status, type, body }) => {
        res.writeHead(status, {
          "Content-Type": type,
          "Cache-Control": "no-store",
        });
        res.end(body);
      })
      .catch((err: unknown) => {
        log.error(err instanceof Error ? err.message : String(err));
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "text/plain" });
        }
        res.end("Internal error");
      });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, resolve);
  }).catch((err: NodeJS.ErrnoException) => {
    log.error(
      err.code === "EADDRINUSE"
        ? `Port ${port} is in use — pass --port <n>.`
        : err.message,
    );
    process.exitCode = 1;
  });
  if (process.exitCode === 1) return;

  const base = config.collections[0]!.basePath;
  log.info("");
  log.success(`voxx dev serving ${c.cyan(`http://localhost:${port}${base}`)}`);
  log.info(
    `  Watching content for changes${includeDrafts ? " (drafts included)" : ""}. Press Ctrl+C to stop.`,
  );

  const close = () =>
    new Promise<void>((resolve) => {
      for (const watcher of watchers) watcher.close();
      server.close(() => {
        void rm(outDir, { recursive: true, force: true }).finally(resolve);
      });
    });

  return { port, close };
}
