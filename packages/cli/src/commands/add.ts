import { join, relative } from "node:path";
import { parseArgs } from "node:util";
import { type ContentType } from "@prudentbird/voxx-core";
import {
  c,
  collisions,
  executeWrites,
  isSafeRelPath,
  log,
  normalizeBase,
  type WriteOp,
  type WriteOutcome,
} from "../util";
import {
  FEATURE_KEYS,
  FEATURES,
  type FeatureFlags,
  type FeatureKey,
} from "../features";
import { planAddCollection } from "../collections";
import {
  collectionOps,
  featureAddOps,
  sampleContentOps,
  VOXX_GROUP,
  type ScaffoldContext,
} from "../scaffold";
import {
  detectTokens,
  loadProject,
  writeConfig,
  type Project,
} from "../project";
import { canPrompt, promptConfirm, PromptCancelled } from "../prompts";

const COLLECTION_TYPES = ["blog", "docs", "changelog"] as const;

const FEATURE_ALIASES: Record<string, FeatureKey> = {
  toc: "toc",
  rss: "rss",
  sitemap: "sitemap",
  robots: "robots",
  llms: "llmsTxt",
  llmstxt: "llmsTxt",
  tags: "tags",
  "reading-time": "readingTime",
  readingtime: "readingTime",
};

function printResults(title: string, results: WriteOutcome[]): void {
  log.info("");
  log.info(c.bold(title));
  for (const [label, status] of results) {
    const mark =
      status === "written"
        ? c.green("+")
        : status === "overwritten"
          ? c.yellow("~")
          : c.dim("•");
    const note =
      status === "skipped"
        ? c.dim(" (exists, skipped)")
        : status === "overwritten"
          ? c.dim(" (overwritten)")
          : "";
    log.info(`  ${mark} ${label}${note}`);
  }
  log.info("");
}

async function writeWithWarning(
  ops: WriteOp[],
  cwd: string,
  force: boolean,
  interactive: boolean,
): Promise<WriteOutcome[]> {
  const overwrite = new Set<string>();
  if (force) {
    for (const op of ops) overwrite.add(op.path);
  } else {
    const existing = await collisions(ops);
    if (existing.length > 0 && interactive) {
      log.warn(`${existing.length} file(s) already exist:`);
      for (const op of existing) {
        log.info(`  ${c.yellow("~")} ${relative(cwd, op.path)}`);
      }
      const ok = await promptConfirm({
        message: "Overwrite these files?",
        initialValue: false,
      });
      if (ok) for (const op of existing) overwrite.add(op.path);
    }
  }
  return executeWrites(ops, overwrite);
}

async function addCollection(
  project: Project,
  rest: string[],
): Promise<void> {
  const { values, positionals } = parseArgs({
    args: rest,
    options: {
      name: { type: "string" },
      dir: { type: "string" },
      base: { type: "string" },
      force: { type: "boolean" },
      yes: { type: "boolean", short: "y" },
    },
    allowPositionals: true,
  });

  const type = positionals[0];
  if (!type || !(COLLECTION_TYPES as readonly string[]).includes(type)) {
    log.error(
      `Usage: voxx add collection <${COLLECTION_TYPES.join("|")}> [--name <name>]`,
    );
    process.exitCode = 1;
    return;
  }
  if (values.dir !== undefined && !isSafeRelPath(values.dir)) {
    log.error(`Invalid --dir "${values.dir}" — must stay within the project.`);
    process.exitCode = 1;
    return;
  }
  if (values.base !== undefined && values.base.split(/[\\/]/).includes("..")) {
    log.error(`Invalid --base "${values.base}" — must not contain "..".`);
    process.exitCode = 1;
    return;
  }

  const name = values.name ?? type;
  const defaultDir =
    project.hasNext && project.appDir
      ? join(project.appDir, VOXX_GROUP, name, "_content")
      : undefined;
  const plan = planAddCollection(project.raw, {
    type: type as ContentType,
    name: values.name,
    dir: values.dir ?? defaultDir,
    base: values.base ? normalizeBase(values.base) : undefined,
  });
  if (!plan.ok) {
    log.error(plan.message);
    process.exitCode = 1;
    return;
  }

  await writeConfig(project.cwd, plan.out);

  const force = Boolean(values.force);
  const interactive = canPrompt() && !values.yes;
  const today = new Date().toISOString().slice(0, 10);

  const ops: WriteOp[] = [
    ...(await sampleContentOps(project.cwd, plan.collection, today)),
  ];
  if (project.hasNext && project.appDir) {
    const ctx: ScaffoldContext = {
      cwd: project.cwd,
      appDir: project.appDir,
      collections: [...project.collections, plan.collection],
      flags: featuresFromConfig(project),
      hasTokens: await detectTokens(project.cwd),
      split: true,
    };
    ops.push(...(await collectionOps(ctx, plan.collection)));
  }

  const results: WriteOutcome[] = [
    [`voxx.json (added collection "${plan.collection.name}")`, "written"],
    ...(await writeWithWarning(ops, project.cwd, force, interactive)),
  ];
  printResults(`voxx add collection ${type}`, results);
  log.info(
    `  Write content in ${c.cyan(`${plan.collection.dir}/`)} (try ${c.cyan(
      `voxx new "Title" --collection ${plan.collection.name}`,
    )}).`,
  );
  log.info("");
}

function featuresFromConfig(project: Project): FeatureFlags {
  const raw = (project.raw["features"] ?? {}) as Partial<
    Record<FeatureKey, boolean>
  >;
  const flags = {} as FeatureFlags;
  for (const key of FEATURE_KEYS) flags[key] = raw[key] ?? true;
  return flags;
}

async function addFeature(
  project: Project,
  key: FeatureKey,
): Promise<void> {
  const features = (project.raw["features"] ?? {}) as Record<string, boolean>;
  const wasEnabled = features[key] === true;
  features[key] = true;
  project.raw["features"] = features;
  await writeConfig(project.cwd, project.raw);

  const results: WriteOutcome[] = [
    [`voxx.json (features.${key} = true)`, wasEnabled ? "skipped" : "written"],
  ];

  if (FEATURES[key].ownsFiles && project.hasNext && project.appDir) {
    const ctx: ScaffoldContext = {
      cwd: project.cwd,
      appDir: project.appDir,
      collections: project.collections,
      flags: featuresFromConfig(project),
      hasTokens: await detectTokens(project.cwd),
      split: true,
    };
    const ops = await featureAddOps(ctx, key);
    const interactive = canPrompt();
    results.push(...(await writeWithWarning(ops, project.cwd, false, interactive)));
  }

  printResults(`voxx add ${key}`, results);
}

export async function add(argv: string[]): Promise<void> {
  const [target, ...rest] = argv;
  if (!target) {
    log.error(
      `Usage: voxx add <${FEATURE_KEYS.join("|")}|collection>`,
    );
    process.exitCode = 1;
    return;
  }

  const project = await loadProject(process.cwd());
  if (!project) {
    log.error("No voxx.json found — run `voxx init` first.");
    process.exitCode = 1;
    return;
  }

  try {
    if (target === "collection") {
      await addCollection(project, rest);
      return;
    }
    const key = FEATURE_ALIASES[target.toLowerCase()];
    if (!key) {
      log.error(
        `Unknown feature "${target}" — expected one of: ${FEATURE_KEYS.join(", ")}, or "collection".`,
      );
      process.exitCode = 1;
      return;
    }
    await addFeature(project, key);
  } catch (err) {
    if (err instanceof PromptCancelled) {
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}
