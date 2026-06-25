import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import {
  parseVersion,
  resolveCollectionDefaults,
  slugify,
  splitDatePrefix,
  splitOrderPrefix,
} from "@prudentbird/voxx-core";
import { exists, isSafeRelPath, log, writeFileSafe, yamlValue } from "../util";

const MD_RE = /\.md$/;

/**
 * Route segments that live under a blog's base path and must not be shadowed
 * by a post slug. `api` is the streaming endpoint (`<basePath>/api`); a post
 * slugged `api` would resolve to the route handler instead of its page.
 */
const RESERVED_SLUGS = ["api"];

type ContentType = "blog" | "docs" | "changelog";

interface VoxxJson {
  content?: { type?: ContentType; dir?: string };
  collections?: Array<{ name?: string; type?: ContentType; dir?: string }>;
}

async function readContentConfig(
  cwd: string,
  collectionName?: string,
): Promise<{ type: ContentType; dir: string } | undefined> {
  const cfgPath = join(cwd, "voxx.json");
  if (!(await exists(cfgPath))) return { type: "blog", dir: "content" };
  const cfg = JSON.parse(await readFile(cfgPath, "utf8")) as VoxxJson;
  const collections = (cfg.collections ?? []).map(resolveCollectionDefaults);
  if (collectionName) {
    const found = collections.find((c) => c.name === collectionName);
    if (!found) {
      log.error(
        `Unknown collection "${collectionName}" — defined: ${collections.map((c) => c.name).join(", ")}`,
      );
      return undefined;
    }
    return found;
  }
  const first = collections[0] ?? {
    type: cfg.content?.type ?? "blog",
    dir: cfg.content?.dir ?? "content",
  };
  return { type: first.type, dir: first.dir };
}

async function existingSlugs(dir: string): Promise<Set<string>> {
  const slugs = new Set<string>();
  try {
    for (const entry of await readdir(dir)) {
      if (!MD_RE.test(entry)) continue;
      const { rest } = splitDatePrefix(entry.replace(MD_RE, ""));
      slugs.add(slugify(splitOrderPrefix(rest).rest));
    }
  } catch {}
  return slugs;
}

function suggestSlug(base: string, taken: Set<string>): string {
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

async function resolveSlug(base: string, taken: Set<string>): Promise<string> {
  if (!taken.has(base)) return base;

  let suggestion = suggestSlug(base, taken);
  if (!process.stdin.isTTY) {
    log.warn(`Slug "${base}" is taken — using "${suggestion}".`);
    return suggestion;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    let takenName = base;
    for (;;) {
      const answer = (
        await rl.question(
          `Slug "${takenName}" is taken. Enter a new slug, or press Enter for "${suggestion}": `,
        )
      ).trim();
      if (!answer) return suggestion;

      const candidate = slugify(answer);
      if (!candidate) {
        log.warn("Please enter a valid slug.");
        continue;
      }
      if (!taken.has(candidate)) return candidate;

      log.warn(`"${candidate}" is also taken.`);
      takenName = candidate;
      suggestion = suggestSlug(candidate, taken);
    }
  } finally {
    rl.close();
  }
}

export async function newPost(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      dir: { type: "string" },
      date: { type: "string" },
      slug: { type: "string" },
      flat: { type: "boolean" },
      section: { type: "string" },
      order: { type: "string" },
      collection: { type: "string" },
      index: { type: "boolean" },
    },
    allowPositionals: true,
  });

  const title = positionals.join(" ").trim();
  if (!title) {
    log.error('Usage: voxx new "My Post Title"');
    process.exitCode = 1;
    return;
  }

  const cwd = process.cwd();
  const detected = await readContentConfig(cwd, values.collection);
  if (!detected) {
    process.exitCode = 1;
    return;
  }
  const contentDir = values.dir ?? detected.dir;
  if (!isSafeRelPath(contentDir)) {
    log.error(
      `Invalid --dir "${contentDir}" — must stay within the project (no "..").`,
    );
    process.exitCode = 1;
    return;
  }
  if (values.index && detected.type !== "docs") {
    log.error("--index only applies to docs content.");
    process.exitCode = 1;
    return;
  }
  const date = values.date ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    log.error(`Invalid --date "${values.date}" — expected YYYY-MM-DD.`);
    process.exitCode = 1;
    return;
  }

  if (detected.type === "changelog") {
    const version = parseVersion(title) ?? title;
    if (
      !isSafeRelPath(`${version}.md`) ||
      version.includes("/") ||
      version.includes("\\")
    ) {
      log.error(
        `Invalid changelog name "${title}" — use a version like "1.2.0".`,
      );
      process.exitCode = 1;
      return;
    }
    const target = join(cwd, contentDir, `${version}.md`);
    const body = [
      "---",
      `title: ${yamlValue(`v${version}`)}`,
      `version: ${yamlValue(version)}`,
      `date: ${date}`,
      "---",
      "",
      "### Added",
      "",
      "- ",
      "",
    ].join("\n");
    const status = await writeFileSafe(target, body, false);
    if (status === "skipped") {
      log.warn(`${relative(cwd, target)} already exists — left untouched.`);
    } else {
      log.success(`Created ${relative(cwd, target)}`);
    }
    return;
  }

  const baseSlug = slugify(values.slug ?? title);
  if (!baseSlug) {
    log.error("Could not derive a slug — pass --slug.");
    process.exitCode = 1;
    return;
  }

  if (detected.type === "docs") {
    if (values.section && !isSafeRelPath(values.section)) {
      log.error(
        `Invalid --section "${values.section}" — must stay within the content directory (no "..").`,
      );
      process.exitCode = 1;
      return;
    }
    const section = (values.section ?? "").split("/").filter(Boolean).join("/");
    const targetDir = section
      ? join(cwd, contentDir, section)
      : join(cwd, contentDir);
    if (values.index) {
      const target = join(targetDir, "index.md");
      const body = [
        "---",
        `title: ${yamlValue(title)}`,
        "description: ",
        "---",
        "",
        "Write your section landing page here.",
        "",
      ].join("\n");
      const status = await writeFileSafe(target, body, false);
      if (status === "skipped") {
        log.warn(`${relative(cwd, target)} already exists — left untouched.`);
      } else {
        log.success(`Created ${relative(cwd, target)}`);
      }
      return;
    }
    const taken = await existingSlugs(targetDir);
    const slug = await resolveSlug(baseSlug, taken);
    const order = values.order ? Number(values.order) : undefined;
    const fileName =
      order !== undefined && Number.isFinite(order)
        ? `${String(order).padStart(2, "0")}-${slug}.md`
        : `${slug}.md`;
    const target = join(targetDir, fileName);
    const body = [
      "---",
      `title: ${yamlValue(title)}`,
      "description: ",
      "---",
      "",
      "Write your page here.",
      "",
    ].join("\n");
    const status = await writeFileSafe(target, body, false);
    if (status === "skipped") {
      log.warn(`${relative(cwd, target)} already exists — left untouched.`);
    } else {
      log.success(`Created ${relative(cwd, target)}`);
    }
    return;
  }

  const taken = await existingSlugs(join(cwd, contentDir));
  for (const reserved of RESERVED_SLUGS) taken.add(reserved);
  const slug = await resolveSlug(baseSlug, taken);

  const fileName = values.flat ? `${slug}.md` : `${date}-${slug}.md`;
  const target = join(cwd, contentDir, fileName);

  const body = [
    "---",
    `title: ${yamlValue(title)}`,
    "description: ",
    `date: ${date}`,
    `slug: ${slug}`,
    "tags: []",
    "---",
    "",
    "Write your post here.",
    "",
  ].join("\n");

  const status = await writeFileSafe(target, body, false);
  if (status === "skipped") {
    log.warn(`${relative(cwd, target)} already exists — left untouched.`);
  } else {
    log.success(`Created ${relative(cwd, target)}`);
  }
}
