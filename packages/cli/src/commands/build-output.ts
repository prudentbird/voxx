import { lstat, readFile, readdir, readlink, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import {
  basename,
  dirname,
  join,
  parse,
  relative,
  resolve,
  sep,
} from "node:path";

export const BUILD_MARKER = ".voxx-build";
export const BUILD_MARKER_CONTENT = "Voxx static output v1\n";

// Resolve existing ancestors too, since the output's final directories may not
// exist yet. Follow dangling links so they cannot hide a future content path.
async function canonical(path: string): Promise<string> {
  const absolute = resolve(path);
  try {
    return await realpath(absolute);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  try {
    if ((await lstat(absolute)).isSymbolicLink()) {
      return canonical(resolve(dirname(absolute), await readlink(absolute)));
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  return join(await canonical(dirname(absolute)), basename(absolute));
}

function contains(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return (
    rel === "" ||
    (rel !== ".." && !rel.startsWith(`..${sep}`) && !parse(rel).root)
  );
}

export async function validateOutput(
  cwd: string,
  outDir: string,
  contentDirs: string[],
  force = false,
): Promise<void> {
  const output = await canonical(outDir);
  const project = await canonical(cwd);
  const home = await canonical(homedir());
  const content = await Promise.all(contentDirs.map(canonical));
  const refuse = (reason: string): never => {
    throw new Error(
      `Refusing to replace output directory "${outDir}": ${reason}.`,
    );
  };
  if (output === parse(output).root || contains(output, home)) {
    refuse("filesystem root, home directory, or an ancestor of home");
  }
  if (contains(output, project)) refuse("contains or equals the project root");
  if (content.some((dir) => contains(output, dir) || contains(dir, output))) {
    refuse("contains, equals, or is inside a content directory");
  }

  let stat;
  try {
    stat = await lstat(outDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw err;
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    refuse("destination must be a directory, not a symlink or file");
  }
  const entries = await readdir(outDir, {
    recursive: true,
    withFileTypes: true,
  });
  if (
    entries.some(
      (entry) => entry.name === "voxx.json" || entry.name === "package.json",
    )
  ) {
    refuse("contains voxx.json or package.json");
  }
  if (entries.length === 0 || force) return;
  const marker = join(outDir, BUILD_MARKER);
  try {
    if (
      (await lstat(marker)).isFile() &&
      (await readFile(marker, "utf8")) === BUILD_MARKER_CONTENT
    )
      return;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  refuse(
    "non-empty directory has no Voxx build marker; pass --force to replace its contents",
  );
}
