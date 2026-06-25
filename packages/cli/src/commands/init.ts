import { spawn } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";
import { type ContentType } from "@prudentbird/voxx-core";
import {
  c,
  collisions,
  exists,
  executeWrites,
  isSafeRelPath,
  log,
  normalizeBase,
  titleCase,
  type WriteOp,
  type WriteOutcome,
} from "../util";
import {
  blankFlags,
  FEATURE_KEYS,
  FEATURES,
  featureOverrides,
  recommendedFlags,
  type FeatureFlags,
  type FeatureKey,
} from "../features";
import {
  buildVoxxJson,
  defaultCollection,
  findConflict,
  type PlannedCollection,
  type SiteMeta,
} from "../collections";
import {
  nextScaffoldOps,
  sampleContentOps,
  VOXX_GROUP,
  type ScaffoldContext,
} from "../scaffold";
import {
  detectAppDir,
  detectTokens,
  pkgHasNext,
  readPkg,
  type Pkg,
} from "../project";
import {
  canPrompt,
  promptConfirm,
  promptMultiselect,
  promptSelect,
  promptText,
  PromptCancelled,
} from "../prompts";

const PRESETS = ["blog", "docs", "changelog"] as const;
type Preset = (typeof PRESETS)[number];

const PRESET_DEFAULTS: Record<Preset, { title: string; description: string }> =
  {
    blog: { title: "My Blog", description: "A blog built with Voxx." },
    docs: { title: "My Docs", description: "Documentation built with Voxx." },
    changelog: {
      title: "Changelog",
      description: "Release notes built with Voxx.",
    },
  };

function run(cmd: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function createNextApp(cwd: string, dir: string): Promise<string | null> {
  log.info("");
  const code = await run("npx", ["create-next-app@latest", dir], cwd);
  if (code !== 0) {
    log.error("create-next-app failed — nothing scaffolded.");
    return null;
  }
  return join(cwd, dir);
}

const ROOT_LAYOUT_FILES = ["layout.tsx", "layout.js"];

/** Returns the existing root layout filename in `appDir`, or `null`. */
async function findRootLayout(
  cwd: string,
  appDir: string,
): Promise<string | null> {
  for (const file of ROOT_LAYOUT_FILES) {
    if (await exists(join(cwd, appDir, file))) return file;
  }
  return null;
}

/**
 * Moves an app's existing root layout, page, and page styles into a `(site)`
 * route group so Voxx can own its own root layout under `(voxx)`. Rewrites the
 * moved layout's `./globals.css` import to the new depth. Returns `true` when a
 * layout was moved.
 *
 * @param cwd - Project root.
 * @param appDir - App router directory relative to `cwd`.
 */
async function splitRootLayout(cwd: string, appDir: string): Promise<boolean> {
  const siteDir = join(cwd, appDir, "(site)");
  const moved: string[] = [];
  for (const file of [
    "layout.tsx",
    "layout.js",
    "page.tsx",
    "page.js",
    "page.module.css",
  ]) {
    const from = join(cwd, appDir, file);
    if (!(await exists(from))) continue;
    await mkdir(siteDir, { recursive: true });
    await rename(from, join(siteDir, file));
    moved.push(file);
  }
  if (!moved.some((f) => f.startsWith("layout."))) return false;
  for (const file of ROOT_LAYOUT_FILES) {
    const path = join(siteDir, file);
    if (!(await exists(path))) continue;
    const src = await readFile(path, "utf8");
    await writeFile(path, src.replace('"./globals.css"', '"../globals.css"'));
  }
  return true;
}

const NEXT_CONFIG_FILES = [
  "next.config.ts",
  "next.config.mjs",
  "next.config.js",
  "next.config.cjs",
];

function nextMajor(pkg: Pkg): number | null {
  const range =
    pkg.dependencies?.["next"] ?? pkg.devDependencies?.["next"] ?? "";
  const m = /(\d+)/.exec(range);
  return m ? Number(m[1]) : null;
}

const CORE_NEXT_IMPORT = "@prudentbird/voxx-core/next";

const MINIMAL_NEXT_CONFIG = `import type { NextConfig } from "next";
import { withVoxx } from "${CORE_NEXT_IMPORT}";

const nextConfig: NextConfig = {};

export default withVoxx(nextConfig);
`;

type ConfigResult =
  | { kind: "wrapped" | "created" | "already"; file: string }
  | { kind: "manual" | "unsupported" };

/**
 * Wraps the default export of an existing next.config with `withVoxx`, adding
 * the matching import. Returns `null` when no recognizable export is found.
 */
function wrapNextConfig(source: string): string | null {
  const esm = source.lastIndexOf("export default ");
  if (esm !== -1) {
    const before = source.slice(0, esm);
    const expr = source
      .slice(esm + "export default ".length)
      .replace(/;?\s*$/, "");
    return `import { withVoxx } from "${CORE_NEXT_IMPORT}";\n${before}export default withVoxx(${expr});\n`;
  }
  const cjs = /module\.exports\s*=\s*/.exec(source);
  if (cjs) {
    const start = cjs.index + cjs[0].length;
    const before = source.slice(0, start);
    const expr = source.slice(start).replace(/;?\s*$/, "");
    return `const { withVoxx } = require("${CORE_NEXT_IMPORT}");\n${before}withVoxx(${expr});\n`;
  }
  return null;
}

async function configureNextConfig(
  cwd: string,
  pkg: Pkg,
): Promise<ConfigResult> {
  const major = nextMajor(pkg);
  if (major !== null && major < 16) return { kind: "unsupported" };

  let file: string | null = null;
  for (const name of NEXT_CONFIG_FILES) {
    if (await exists(join(cwd, name))) {
      file = name;
      break;
    }
  }

  if (!file) {
    if (major === null) return { kind: "manual" };
    await writeFile(join(cwd, "next.config.ts"), MINIMAL_NEXT_CONFIG);
    return { kind: "created", file: "next.config.ts" };
  }

  const source = await readFile(join(cwd, file), "utf8");
  if (/\bwithVoxx\b/.test(source)) return { kind: "already", file };

  const wrapped = wrapNextConfig(source);
  if (wrapped === null) return { kind: "manual" };
  await writeFile(join(cwd, file), wrapped);
  return { kind: "wrapped", file };
}

interface InitFlags {
  app?: string;
  dir?: string;
  base?: string;
  name?: string;
  target?: string;
  static?: boolean;
  next?: boolean;
  isolate?: boolean;
  force?: boolean;
  yes?: boolean;
  features: Partial<FeatureFlags>;
}

/**
 * Resolves a collection's content directory. Next.js projects keep content in a
 * private `_content` folder beside the collection's routes; static sites use a
 * top-level `content/` tree.
 */
function collectionDir(
  mode: "static" | "next",
  appDir: string | null,
  name: string,
): string {
  if (mode === "next" && appDir) {
    return join(appDir, VOXX_GROUP, name, "_content");
  }
  return `content/${name}`;
}

const FEATURE_FLAG_NAMES: Record<string, FeatureKey> = {
  toc: "toc",
  rss: "rss",
  sitemap: "sitemap",
  robots: "robots",
  llms: "llmsTxt",
  tags: "tags",
  "reading-time": "readingTime",
};

function parseFeatureFlags(
  values: Record<string, unknown>,
): Partial<FeatureFlags> {
  const out: Partial<FeatureFlags> = {};
  for (const [flag, key] of Object.entries(FEATURE_FLAG_NAMES)) {
    if (values[`no-${flag}`]) out[key] = false;
    else if (values[flag]) out[key] = true;
  }
  return out;
}

/**
 * Merges recommended feature flags for the chosen types with explicit CLI
 * overrides, so unspecified features keep their type-appropriate default.
 */
function resolveFlags(
  types: readonly ContentType[],
  overrides: Partial<FeatureFlags>,
): FeatureFlags {
  const flags = recommendedFlags(types);
  for (const key of FEATURE_KEYS) {
    if (overrides[key] !== undefined) flags[key] = overrides[key]!;
  }
  return flags;
}

function siteMeta(pkg: Pkg, firstType: Preset): SiteMeta {
  return {
    title: pkg.name ? titleCase(pkg.name) : PRESET_DEFAULTS[firstType].title,
    description: PRESET_DEFAULTS[firstType].description,
    url: "https://example.com",
    locale: "en-US",
  };
}

interface ResolvedPlan {
  mode: "static" | "next";
  cwd: string;
  createdAppDir: string | null;
  appDir: string | null;
  collections: PlannedCollection[];
  site: SiteMeta;
  flags: FeatureFlags;
}

/**
 * Resolves the full init plan through interactive prompts, asking only for the
 * values the user did not pass as flags.
 */
async function resolveInteractive(
  startCwd: string,
  initialPkg: Pkg,
  hasNext: boolean,
  flags: InitFlags,
  cliTypes: ContentType[],
): Promise<ResolvedPlan | null> {
  let cwd = startCwd;
  let pkg = initialPkg;
  let mode: "static" | "next" = hasNext ? "next" : "static";
  let createdAppDir: string | null = null;

  if (!hasNext) {
    const chosen = flags.next ? "next" : flags.static ? "static" : undefined;
    mode =
      chosen ??
      (await promptSelect<"static" | "next">({
        message: "How do you want to set up Voxx?",
        options: [
          {
            value: "static",
            label: "Static site",
            hint: "markdown in, HTML/CSS out via voxx build",
          },
          {
            value: "next",
            label: "New Next.js app",
            hint: "runs create-next-app, then scaffolds",
          },
        ],
        initialValue: "static",
      }));

    if (mode === "next") {
      const dir =
        flags.target ??
        (await promptText({
          message: "Directory for the new app",
          placeholder: "my-app",
          defaultValue: "my-app",
        }));
      createdAppDir = await createNextApp(cwd, dir);
      if (!createdAppDir) return null;
      cwd = createdAppDir;
      pkg = await readPkg(cwd);
    } else {
      const target =
        flags.target ??
        (await promptText({
          message: "Project directory",
          placeholder: ".",
          defaultValue: ".",
        }));
      cwd = join(cwd, target);
    }
  }

  const types =
    cliTypes.length > 0
      ? cliTypes
      : await promptMultiselect<ContentType>({
          message: "Which collections do you want?",
          options: PRESETS.map((p) => ({
            value: p,
            label: titleCase(p),
            hint: PRESET_DEFAULTS[p].description,
          })),
          initialValues: ["blog"],
          required: true,
        });

  const appDir =
    mode === "next" ? (flags.app ?? (await detectAppDir(cwd))) : null;

  const collections: PlannedCollection[] = [];
  const single = types.length === 1;
  for (const type of types) {
    const name = single
      ? (flags.name ?? type)
      : await promptText({
          message: `Name for the ${titleCase(type)} collection`,
          placeholder: type,
          defaultValue: type,
          validate: (v) =>
            /^[a-z0-9][a-z0-9-]*$/.test(v.trim() || type)
              ? undefined
              : "Use lowercase letters, numbers, and dashes.",
        });
    const base = single && flags.base ? normalizeBase(flags.base) : undefined;
    const dir =
      single && flags.dir ? flags.dir : collectionDir(mode, appDir, name);
    const collection = defaultCollection(type, name);
    collections.push({
      ...collection,
      dir,
      ...(base ? { basePath: base } : {}),
    });
  }

  const conflict = findConflict(collections);
  if (conflict) {
    log.error(
      `Two collections share the same ${conflict.field} "${conflict.value}" — give them distinct names.`,
    );
    return null;
  }
  const segmentError = nextSegmentError(mode, collections);
  if (segmentError) {
    log.error(segmentError);
    return null;
  }

  const firstType = types[0]!;
  const defaults = siteMeta(pkg, firstType);
  const title = await promptText({
    message: "Site title",
    placeholder: defaults.title,
    defaultValue: defaults.title,
  });
  const description = await promptText({
    message: "Site description",
    placeholder: defaults.description,
    defaultValue: defaults.description,
  });
  const url = await promptText({
    message: "Site URL",
    placeholder: defaults.url,
    defaultValue: defaults.url,
  });

  const recommended = recommendedFlags(types);
  const selected = await promptMultiselect<FeatureKey>({
    message: "Which features do you want?",
    options: FEATURE_KEYS.map((key) => ({
      value: key,
      label: FEATURES[key].label,
      hint: FEATURES[key].hint,
    })),
    initialValues: FEATURE_KEYS.filter((k) => recommended[k]),
  });
  const chosenFlags = blankFlags();
  for (const key of selected) chosenFlags[key] = true;

  return {
    mode,
    cwd,
    createdAppDir,
    appDir,
    collections,
    site: { title, description, url, locale: defaults.locale },
    flags: chosenFlags,
  };
}

/**
 * Returns an error message when a Next.js collection would mount at the app
 * root, which collides with the Voxx root layout, or `null` when all segments
 * are non-empty.
 */
function nextSegmentError(
  mode: "static" | "next",
  collections: readonly PlannedCollection[],
): string | null {
  if (mode !== "next") return null;
  if (collections.some((c) => c.basePath === "/")) {
    return "A Next.js collection cannot mount at the root path — give it a base like /blog.";
  }
  return null;
}

/**
 * Resolves the full init plan from flags alone, for non-interactive and CI use.
 */
async function resolveHeadless(
  cwd: string,
  pkg: Pkg,
  hasNext: boolean,
  flags: InitFlags,
  cliTypes: ContentType[],
): Promise<ResolvedPlan | null> {
  const types = cliTypes.length > 0 ? cliTypes : ["blog" as ContentType];
  let mode: "static" | "next" = hasNext ? "next" : "static";
  let projectCwd = cwd;
  let createdAppDir: string | null = null;

  if (!hasNext) {
    mode = flags.next ? "next" : "static";
    if (mode === "next") {
      createdAppDir = await createNextApp(cwd, flags.target ?? "my-app");
      if (!createdAppDir) return null;
      projectCwd = createdAppDir;
      pkg = await readPkg(projectCwd);
    } else if (flags.target) {
      projectCwd = join(cwd, flags.target);
    }
  }

  const appDir =
    mode === "next" ? (flags.app ?? (await detectAppDir(projectCwd))) : null;

  const single = types.length === 1;
  const collections = types.map((type) => {
    const name = single ? (flags.name ?? type) : type;
    const collection = defaultCollection(type, name);
    return {
      ...collection,
      dir: single && flags.dir ? flags.dir : collectionDir(mode, appDir, name),
      ...(single && flags.base ? { basePath: normalizeBase(flags.base) } : {}),
    };
  });

  const conflict = findConflict(collections);
  if (conflict) {
    log.error(
      `Two collections share the same ${conflict.field} "${conflict.value}" — give them distinct names.`,
    );
    return null;
  }
  const segmentError = nextSegmentError(mode, collections);
  if (segmentError) {
    log.error(segmentError);
    return null;
  }

  return {
    mode,
    cwd: projectCwd,
    createdAppDir,
    appDir,
    collections,
    site: siteMeta(pkg, types[0] as Preset),
    flags: resolveFlags(types, flags.features),
  };
}

function printSummary(
  title: string,
  results: WriteOutcome[],
  prefix: string,
): void {
  log.info("");
  log.info(c.bold(title));
  for (const [label, status, siteWide] of results) {
    const mark =
      status === "written"
        ? c.green("+")
        : status === "overwritten"
          ? c.yellow("~")
          : c.dim("•");
    const note =
      status === "skipped"
        ? siteWide
          ? c.dim(" (site-wide, already present)")
          : c.dim(" (exists, skipped)")
        : status === "overwritten"
          ? c.dim(" (overwritten)")
          : "";
    log.info(`  ${mark} ${prefix}${label}${note}`);
  }
}

export async function init(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      dir: { type: "string" },
      base: { type: "string" },
      app: { type: "string" },
      name: { type: "string" },
      target: { type: "string" },
      static: { type: "boolean" },
      next: { type: "boolean" },
      isolate: { type: "boolean" },
      "no-isolate": { type: "boolean" },
      force: { type: "boolean" },
      yes: { type: "boolean", short: "y" },
      toc: { type: "boolean" },
      "no-toc": { type: "boolean" },
      rss: { type: "boolean" },
      "no-rss": { type: "boolean" },
      sitemap: { type: "boolean" },
      "no-sitemap": { type: "boolean" },
      robots: { type: "boolean" },
      "no-robots": { type: "boolean" },
      llms: { type: "boolean" },
      "no-llms": { type: "boolean" },
      tags: { type: "boolean" },
      "no-tags": { type: "boolean" },
      "reading-time": { type: "boolean" },
      "no-reading-time": { type: "boolean" },
    },
    allowPositionals: true,
  });

  const cliTypes: ContentType[] = [];
  for (const p of positionals) {
    if (!(PRESETS as readonly string[]).includes(p)) {
      log.error(
        `Unknown collection type "${p}" — expected one of: ${PRESETS.join(", ")}.`,
      );
      process.exitCode = 1;
      return;
    }
    if (!cliTypes.includes(p as ContentType)) cliTypes.push(p as ContentType);
  }

  if (values.dir !== undefined && !isSafeRelPath(values.dir)) {
    log.error(`Invalid --dir "${values.dir}" — must stay within the project.`);
    process.exitCode = 1;
    return;
  }
  if (values.app !== undefined && !isSafeRelPath(values.app)) {
    log.error(`Invalid --app "${values.app}" — must stay within the project.`);
    process.exitCode = 1;
    return;
  }
  if (values.target !== undefined && !isSafeRelPath(values.target)) {
    log.error(
      `Invalid --target "${values.target}" — must stay within the project.`,
    );
    process.exitCode = 1;
    return;
  }
  if (values.base !== undefined && values.base.split(/[\\/]/).includes("..")) {
    log.error(`Invalid --base "${values.base}" — must not contain "..".`);
    process.exitCode = 1;
    return;
  }
  if (cliTypes.length > 1 && (values.name || values.dir || values.base)) {
    log.error(
      "--name, --dir, and --base apply only when scaffolding a single collection type.",
    );
    process.exitCode = 1;
    return;
  }

  const flags: InitFlags = {
    app: values.app,
    dir: values.dir,
    base: values.base,
    name: values.name,
    target: values.target,
    static: values.static,
    next: values.next,
    isolate: values.isolate ? true : values["no-isolate"] ? false : undefined,
    force: values.force,
    yes: values.yes,
    features: parseFeatureFlags(values),
  };

  const startCwd = process.cwd();
  const pkg = await readPkg(startCwd);
  const hasNext = pkgHasNext(pkg);
  const interactive = canPrompt() && !values.yes;

  let plan: ResolvedPlan | null;
  try {
    plan = interactive
      ? await resolveInteractive(startCwd, pkg, hasNext, flags, cliTypes)
      : await resolveHeadless(startCwd, pkg, hasNext, flags, cliTypes);
  } catch (err) {
    if (err instanceof PromptCancelled) {
      process.exitCode = 1;
      return;
    }
    throw err;
  }
  if (!plan) {
    process.exitCode = 1;
    return;
  }

  try {
    await scaffoldPlan(
      startCwd,
      plan,
      Boolean(flags.force),
      interactive,
      flags.isolate,
    );
  } catch (err) {
    if (err instanceof PromptCancelled) {
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}

/**
 * Decides whether Voxx owns its own root layout, performing the `(site)` split
 * when appropriate. New apps always split; existing apps are split only when
 * the user opts in (prompt or `--isolate`), otherwise Voxx nests under the
 * existing root and a chrome-bleed warning is printed.
 */
async function resolveSplit(
  cwd: string,
  appDir: string,
  plan: ResolvedPlan,
  isolate: boolean | undefined,
  interactive: boolean,
): Promise<{ split: boolean; moved: boolean }> {
  if (plan.createdAppDir) {
    return { split: true, moved: await splitRootLayout(cwd, appDir) };
  }

  const existing = await findRootLayout(cwd, appDir);
  if (!existing) return { split: true, moved: false };

  const warn = () => {
    const base = plan.collections[0]!.basePath;
    log.warn(
      `This app already has a root layout at ${c.cyan(`${appDir}/${existing}`)} — it will wrap Voxx routes, so its navbar/footer will show inside ${c.cyan(base)}.`,
    );
    log.info(
      `  ${c.dim(`Re-run with ${"--isolate"} to move it into a (site) group and give Voxx its own root layout.`)}`,
    );
  };

  if (isolate === true) {
    return { split: true, moved: await splitRootLayout(cwd, appDir) };
  }
  if (isolate === false) {
    warn();
    return { split: false, moved: false };
  }
  if (interactive) {
    const choice = await promptSelect<"fix" | "ignore">({
      message: `An existing root layout (${appDir}/${existing}) will wrap Voxx routes. How should Voxx set up its root?`,
      options: [
        {
          value: "fix",
          label: "Fix — move my layout into a (site) group",
          hint: "Voxx gets its own root layout; your routes are unchanged",
        },
        {
          value: "ignore",
          label: "Ignore — nest under my existing layout",
          hint: "your navbar/footer will show inside Voxx routes",
        },
      ],
      initialValue: "fix",
    });
    if (choice === "fix") {
      return { split: true, moved: await splitRootLayout(cwd, appDir) };
    }
    warn();
    return { split: false, moved: false };
  }

  warn();
  return { split: false, moved: false };
}

/**
 * Materializes a resolved plan: writes `voxx.json`, sample content, and (for
 * Next projects) route files, warning before any overwrite.
 */
async function scaffoldPlan(
  startCwd: string,
  plan: ResolvedPlan,
  force: boolean,
  interactive: boolean,
  isolate: boolean | undefined,
): Promise<void> {
  const { cwd, collections, site, flags } = plan;
  const firstType = collections[0]!.type;
  const today = new Date().toISOString().slice(0, 10);

  const ops: WriteOp[] = [];
  ops.push({
    path: join(cwd, "voxx.json"),
    label: "voxx.json",
    content: `${JSON.stringify(
      buildVoxxJson(site, collections, featureOverrides(flags, firstType)),
      null,
      2,
    )}\n`,
  });
  for (const collection of collections) {
    ops.push(...(await sampleContentOps(cwd, collection, today)));
  }

  let resolvedAppDir: string | null = null;
  let configResult: ConfigResult | null = null;
  let wroteGlobals = false;
  let movedToSite = false;

  if (plan.mode === "next") {
    resolvedAppDir = plan.appDir ?? (await detectAppDir(cwd));
    if (!resolvedAppDir) {
      const results = await runWrites(ops, force, interactive, startCwd);
      printSummary("voxx init", results, prefixFor(startCwd, cwd, plan));
      log.warn(
        "Next.js found but no app/ directory — pass --app <dir> to scaffold routes.",
      );
      log.info("");
      return;
    }

    const hasTokens = await detectTokens(cwd);
    wroteGlobals = !hasTokens;

    const { split, moved } = await resolveSplit(
      cwd,
      resolvedAppDir,
      plan,
      isolate,
      interactive,
    );
    movedToSite = moved;

    const ctx: ScaffoldContext = {
      cwd,
      appDir: resolvedAppDir,
      collections,
      flags,
      hasTokens,
      split,
    };
    ops.push(...(await nextScaffoldOps(ctx)));
  }

  const results = await runWrites(ops, force, interactive, startCwd);
  if (movedToSite && resolvedAppDir) {
    results.push([
      `${join(resolvedAppDir, "(site)")}/ (your root layout moved here)`,
      "written",
      true,
    ]);
  }

  if (plan.mode === "next" && resolvedAppDir) {
    configResult = await configureNextConfig(cwd, await readPkg(cwd));
    if (configResult.kind === "wrapped" || configResult.kind === "created") {
      results.push([`${configResult.file} (wrapped with withVoxx)`, "written"]);
    }
  }

  printSummary("voxx init", results, prefixFor(startCwd, cwd, plan));
  printNextSteps(plan, {
    appDir: resolvedAppDir,
    configResult,
    wroteGlobals,
    startCwd,
  });
}

function prefixFor(startCwd: string, cwd: string, plan: ResolvedPlan): string {
  if (plan.createdAppDir) return `${relative(startCwd, cwd)}/`;
  if (cwd !== startCwd) return `${relative(startCwd, cwd)}/`;
  return "";
}

async function runWrites(
  ops: WriteOp[],
  force: boolean,
  interactive: boolean,
  startCwd: string,
): Promise<WriteOutcome[]> {
  const overwrite = new Set<string>();
  if (force) {
    for (const op of ops) overwrite.add(op.path);
  } else {
    const existing = await collisions(ops);
    if (existing.length > 0) {
      if (interactive) {
        log.warn(
          `${existing.length} file(s) already exist and would be overwritten:`,
        );
        for (const op of existing) {
          log.info(`  ${c.yellow("~")} ${relative(startCwd, op.path)}`);
        }
        const ok = await promptConfirm({
          message: "Overwrite these files?",
          initialValue: false,
        });
        if (ok) for (const op of existing) overwrite.add(op.path);
      }
    }
  }
  return executeWrites(ops, overwrite);
}

function printNextSteps(
  plan: ResolvedPlan,
  ctx: {
    appDir: string | null;
    configResult: ConfigResult | null;
    wroteGlobals: boolean;
    startCwd: string;
  },
): void {
  const { collections } = plan;
  const firstBase = collections[0]!.basePath;
  const firstDir = collections[0]!.dir;
  const firstType = collections[0]!.type;

  log.info("");
  log.info(c.bold("Next steps:"));

  if (plan.mode === "static") {
    const writeHint =
      firstType === "docs"
        ? `Write pages in ${c.cyan(`${firstDir}/`)} — folders become sections.`
        : firstType === "changelog"
          ? `Add releases in ${c.cyan(`${firstDir}/`)} (try ${c.cyan('voxx new "0.2.0"')}).`
          : `Write posts in ${c.cyan(`${firstDir}/`)} (try ${c.cyan('voxx new "My post"')}).`;
    log.info(`  1. ${writeHint}`);
    log.info(`  2. Set ${c.cyan("site.url")} in ${c.cyan("voxx.json")}.`);
    log.info(
      `  3. Run ${c.cyan("voxx build")} to render static HTML to ${c.cyan("./dist")}.`,
    );
    log.info("");
    return;
  }

  if (!ctx.appDir) {
    log.info("");
    return;
  }

  let step = 1;
  if (plan.createdAppDir) {
    log.info(
      `  ${step++}. ${c.cyan(`cd ${relative(ctx.startCwd, plan.createdAppDir)}`)}`,
    );
  }
  log.info(
    `  ${step++}. Install the engine:  ${c.cyan("npm i @prudentbird/voxx-core")}`,
  );
  if (ctx.configResult?.kind === "manual") {
    log.info(
      `  ${step++}. Wrap your config — ${c.cyan("export default withVoxx(nextConfig)")} from ${c.cyan(CORE_NEXT_IMPORT)}.`,
    );
  } else if (ctx.configResult?.kind === "unsupported") {
    log.info(
      `  ${step++}. Upgrade to Next 16+, then wrap your config with ${c.cyan("withVoxx")} from ${c.cyan(CORE_NEXT_IMPORT)}.`,
    );
  }
  log.info(`  ${step++}. Set ${c.cyan("site.url")} in ${c.cyan("voxx.json")}.`);
  log.info(`  ${step}. Run your dev server and open ${c.cyan(firstBase)}.`);
  if (ctx.configResult?.kind === "already") {
    log.info(
      `  ${c.dim(`(next.config already wrapped with withVoxx in ${ctx.configResult.file}.)`)}`,
    );
  }
  if (ctx.wroteGlobals) {
    log.info(
      `  ${c.dim("(No design tokens found — added voxx-globals.css so it looks good out of the box.)")}`,
    );
  }
  log.info("");
}
