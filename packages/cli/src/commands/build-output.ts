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
export async function canonicalPath(path: string): Promise<string> {
  const absolute = resolve(path);
  try {
    return await realpath(absolute);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  try {
    if ((await lstat(absolute)).isSymbolicLink()) {
      return canonicalPath(
        resolve(dirname(absolute), await readlink(absolute)),
      );
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  return join(await canonicalPath(dirname(absolute)), basename(absolute));
}

function contains(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return (
    rel === "" ||
    (rel !== ".." && !rel.startsWith(`..${sep}`) && !parse(rel).root)
  );
}

async function hasMarker(dir: string): Promise<boolean> {
  try {
    const marker = join(dir, BUILD_MARKER);
    return (
      (await lstat(marker)).isFile() &&
      (await readFile(marker, "utf8")) === BUILD_MARKER_CONTENT
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    return false;
  }
}

export async function validateOutput(
  cwd: string,
  outDir: string,
  contentDirs: string[],
  force = false,
): Promise<void> {
  const output = await canonicalPath(outDir);
  const project = await canonicalPath(cwd);
  const home = await canonicalPath(homedir());
  const content = await Promise.all(contentDirs.map(canonicalPath));
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
  if ((await readdir(outDir)).length === 0) return;
  // Previous Voxx output is safe to replace as-is: copied assets such as
  // assets/package.json may legitimately contain these file names.
  if (await hasMarker(outDir)) return;
  const entries = await readdir(outDir, { recursive: true });
  if (
    entries.some((entry) =>
      ["voxx.json", "package.json"].includes(basename(entry)),
    )
  ) {
    refuse("contains voxx.json or package.json");
  }
  if (force) return;
  refuse(
    "non-empty directory has no Voxx build marker; pass --force to replace its contents",
  );
}
