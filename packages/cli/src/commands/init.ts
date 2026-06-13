import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import {
  DEFAULT_CONFIG,
  resolveCollectionDefaults,
  type CollectionInput,
} from "@prudentbird/voxx-core";
import {
  c,
  exists,
  isSafeRelPath,
  log,
  normalizeBase,
  readTemplate,
  render,
  resolveCoreAsset,
  titleCase,
  writeFileSafe,
  type WriteStatus,
} from "../util";

const APP_DIR_CANDIDATES = ["app", "src/app"];
const GLOBALS_CANDIDATES = [
  "app/globals.css",
  "src/app/globals.css",
  "styles/globals.css",
  "src/styles/globals.css",
  "app/global.css",
];

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

type Pkg = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

async function readPkg(cwd: string): Promise<Pkg> {
  if (await exists(join(cwd, "package.json"))) {
    return JSON.parse(await readFile(join(cwd, "package.json"), "utf8"));
  }
  return {};
}

function pkgHasNext(pkg: Pkg): boolean {
  return Boolean(pkg.dependencies?.["next"] ?? pkg.devDependencies?.["next"]);
}

async function detectAppDir(cwd: string): Promise<string | null> {
  for (const dir of APP_DIR_CANDIDATES) {
    if (await exists(join(cwd, dir))) return dir;
  }
  return null;
}

async function detectTokens(cwd: string): Promise<boolean> {
  for (const rel of GLOBALS_CANDIDATES) {
    const path = join(cwd, rel);
    if (await exists(path)) {
      const css = await readFile(path, "utf8");
      if (css.includes("--background") || css.includes("--foreground"))
        return true;
    }
  }
  return false;
}

async function copyAsset(
  subpath: string,
  target: string,
  force: boolean,
): Promise<WriteStatus> {
  if (!force && (await exists(target))) return "skipped";
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolveCoreAsset(subpath), target);
  return "written";
}

function run(cmd: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function chooseSetup(): Promise<"static" | "next"> {
  if (!process.stdin.isTTY) return "static";

  log.warn("No Next.js app detected here.");
  log.info(
    `  ${c.cyan("1.")} Static site — markdown in, HTML/CSS out via ${c.cyan("voxx build")}`,
  );
  log.info(
    `  ${c.cyan("2.")} New Next.js app — runs ${c.cyan("create-next-app")}, then scaffolds`,
  );

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const answer = (await rl.question(`Choose [1/2] (default 1): `)).trim();
      if (answer === "" || answer === "1") return "static";
      if (answer === "2") return "next";
      log.warn("Please answer 1 or 2.");
    }
  } finally {
    rl.close();
  }
}

async function createNextApp(cwd: string): Promise<string | null> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let dir: string;
  try {
    dir =
      (
        await rl.question(
          `Directory for the new app (default ${c.cyan("my-app")}): `,
        )
      ).trim() || "my-app";
  } finally {
    rl.close();
  }

  log.info("");
  const code = await run("npx", ["create-next-app@latest", dir], cwd);
  if (code !== 0) {
    log.error("create-next-app failed — nothing scaffolded.");
    return null;
  }
  return join(cwd, dir);
}

async function isolateCreatedApp(
  cwd: string,
  appDir: string,
): Promise<boolean> {
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
  for (const file of ["layout.tsx", "layout.js"]) {
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

const MINIMAL_NEXT_CONFIG = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
`;

type CacheComponentsResult =
  | { kind: "enabled" | "created" | "already"; file: string }
  | { kind: "manual" | "unsupported" };

async function enableCacheComponents(
  cwd: string,
  pkg: Pkg,
): Promise<CacheComponentsResult> {
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
  if (/\bcacheComponents\b/.test(source)) return { kind: "already", file };

  const m =
    /(const\s+nextConfig\s*(?::\s*[\w.]+)?\s*=\s*|export\s+default\s+|module\.exports\s*=\s*)\{/.exec(
      source,
    );
  if (!m) return { kind: "manual" };

  const at = m.index + m[0].length;
  const rest = source.slice(at);
  const insert = rest.trimStart().startsWith("}")
    ? "\n  cacheComponents: true,\n"
    : "\n  cacheComponents: true,";
  await writeFile(join(cwd, file), source.slice(0, at) + insert + rest);
  return { kind: "enabled", file };
}

type RawConfig = Record<string, unknown>;

type AddPlan =
  | {
      ok: true;
      out: RawConfig;
      name: string;
      dir: string;
      basePath: string;
    }
  | { ok: false; message: string };

function planAdd(
  raw: RawConfig,
  preset: Preset,
  values: { name?: string; dir?: string; base?: string },
): AddPlan {
  const rawCollections = Array.isArray(raw["collections"])
    ? (raw["collections"] as CollectionInput[])
    : [];
  const rawContent = (raw["content"] ?? undefined) as
    | CollectionInput
    | undefined;

  const existing =
    rawCollections.length > 0
      ? rawCollections.map(resolveCollectionDefaults)
      : [
          {
            name: rawContent?.type ?? DEFAULT_CONFIG.content.type,
            type: rawContent?.type ?? DEFAULT_CONFIG.content.type,
            dir: rawContent?.dir ?? DEFAULT_CONFIG.content.dir,
            basePath: rawContent?.basePath ?? DEFAULT_CONFIG.content.basePath,
            drafts: rawContent?.drafts ?? false,
          },
        ];
  const first = existing[0]!;

  const name = values.name ?? preset;
  const dir = values.dir ?? `content/${name}`;
  const basePath = normalizeBase(values.base ?? `/${name}`);

  if (existing.some((c) => c.name === name)) {
    return {
      ok: false,
      message: `Collection "${name}" already exists — defined: ${existing
        .map((c) => c.name)
        .join(", ")}. Pass --name <other>.`,
    };
  }
  const dupBase = existing.find((c) => c.basePath === basePath);
  if (dupBase) {
    return {
      ok: false,
      message: `Base path "${basePath}" is already used by collection "${dupBase.name}" — pass --base <path>.`,
    };
  }
  const dupDir = existing.find((c) => c.dir === dir);
  if (dupDir) {
    return {
      ok: false,
      message: `Content dir "${dir}" is already used by collection "${dupDir.name}" — pass --dir <dir>.`,
    };
  }

  const next = { name, type: preset, dir, basePath, drafts: false };

  if (rawCollections.length > 0) {
    return {
      ok: true,
      out: { ...raw, collections: [...rawCollections, next] },
      name,
      dir,
      basePath,
    };
  }

  const migrated: Record<string, unknown> = {
    name: first.name,
    ...(rawContent ?? {}),
  };
  const reResolved = resolveCollectionDefaults(migrated as CollectionInput);
  if (reResolved.dir !== first.dir) migrated["dir"] = first.dir;
  if (reResolved.basePath !== first.basePath) {
    migrated["basePath"] = first.basePath;
  }

  const collections = [migrated, next];
  const out: RawConfig = {};
  let inserted = false;
  for (const [key, value] of Object.entries(raw)) {
    if (key === "content" || key === "collections") {
      if (!inserted) {
        out["collections"] = collections;
        inserted = true;
      }
      continue;
    }
    out[key] = value;
  }
  if (!inserted) out["collections"] = collections;

  return { ok: true, out, name, dir, basePath };
}

export async function init(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      dir: { type: "string" },
      base: { type: "string" },
      app: { type: "string" },
      name: { type: "string" },
      add: { type: "boolean" },
      force: { type: "boolean" },
    },
    allowPositionals: true,
  });

  const presetArg = positionals[0] ?? "blog";
  if (!(PRESETS as readonly string[]).includes(presetArg)) {
    log.error(
      `Unknown preset "${presetArg}" — expected one of: ${PRESETS.join(", ")}.`,
    );
    process.exitCode = 1;
    return;
  }
  const preset = presetArg as Preset;
  const add = Boolean(values.add);
  const force = Boolean(values.force);

  if (add && force) {
    log.error(
      "--add and --force cannot be combined — --add never overwrites. Delete the collection's files and re-run if you need a clean re-scaffold.",
    );
    process.exitCode = 1;
    return;
  }
  if (!add && values.name !== undefined) {
    log.error("--name only applies with --add.");
    process.exitCode = 1;
    return;
  }

  if (values.dir !== undefined && !isSafeRelPath(values.dir)) {
    log.error(
      `Invalid --dir "${values.dir}" — must stay within the project (no "..").`,
    );
    process.exitCode = 1;
    return;
  }
  if (values.app !== undefined && !isSafeRelPath(values.app)) {
    log.error(
      `Invalid --app "${values.app}" — must stay within the project (no "..").`,
    );
    process.exitCode = 1;
    return;
  }
  if (values.base !== undefined && values.base.split(/[\\/]/).includes("..")) {
    log.error(`Invalid --base "${values.base}" — must not contain "..".`);
    process.exitCode = 1;
    return;
  }

  let cwd = process.cwd();
  let contentDir = values.dir ?? "content";
  let basePath = normalizeBase(values.base ?? `/${preset}`);
  let collectionName: string = preset;

  let pkg = await readPkg(cwd);
  let hasNext = pkgHasNext(pkg);
  let createdAppDir: string | null = null;
  let staticChoice = false;

  const results: Array<
    [label: string, status: WriteStatus, siteWide?: boolean]
  > = [];

  if (add) {
    const cfgPath = join(cwd, "voxx.json");
    if (!(await exists(cfgPath))) {
      log.error(
        `--add requires an existing voxx.json — run ${c.cyan(`voxx init ${preset}`)} first.`,
      );
      process.exitCode = 1;
      return;
    }
    let raw: RawConfig;
    try {
      raw = JSON.parse(await readFile(cfgPath, "utf8")) as RawConfig;
    } catch {
      log.error("voxx.json is not valid JSON — fix it before running --add.");
      process.exitCode = 1;
      return;
    }
    const plan = planAdd(raw, preset, values);
    if (!plan.ok) {
      log.error(plan.message);
      process.exitCode = 1;
      return;
    }
    collectionName = plan.name;
    contentDir = plan.dir;
    basePath = plan.basePath;
    await writeFile(cfgPath, `${JSON.stringify(plan.out, null, 2)}\n`);
    results.push([
      `voxx.json (added collection "${collectionName}")`,
      "written",
    ]);
  } else if (!hasNext) {
    const setup = await chooseSetup();
    if (setup === "next") {
      createdAppDir = await createNextApp(cwd);
      if (!createdAppDir) {
        process.exitCode = 1;
        return;
      }
      cwd = createdAppDir;
      pkg = await readPkg(cwd);
      hasNext = pkgHasNext(pkg);
    } else {
      staticChoice = true;
    }
  }

  const baseSegment = basePath.slice(1);
  const appDir = values.app ?? (await detectAppDir(cwd));
  const siteTitle = pkg.name
    ? titleCase(pkg.name)
    : PRESET_DEFAULTS[preset].title;

  if (!add) {
    results.push([
      "voxx.json",
      await writeFileSafe(
        join(cwd, "voxx.json"),
        render(await readTemplate("shared/voxx.json.tpl"), {
          SITE_TITLE: siteTitle,
          SITE_DESCRIPTION: PRESET_DEFAULTS[preset].description,
          SITE_URL: "https://example.com",
          TYPE: preset,
          CONTENT_DIR: contentDir,
          BASE_PATH: basePath,
        }),
        force,
      ),
    ]);
  }

  const today = new Date().toISOString().slice(0, 10);
  const samples: Array<[string, string, Record<string, string>?]> =
    preset === "docs"
      ? [
          ["docs/index.md.tpl", "index.md"],
          [
            "docs/getting-started-index.md.tpl",
            join("01-getting-started", "index.md"),
          ],
          [
            "docs/installation.md.tpl",
            join("01-getting-started", "01-installation.md"),
          ],
        ]
      : preset === "changelog"
        ? [["changelog/release.md.tpl", "0.1.0.md", { DATE: today }]]
        : [["blog/hello-world.md.tpl", "hello-world.md", { DATE: today }]];
  for (const [tpl, rel, vars] of samples) {
    results.push([
      join(contentDir, rel),
      await writeFileSafe(
        join(cwd, contentDir, rel),
        render(await readTemplate(tpl), vars ?? {}),
        force,
      ),
    ]);
  }

  let wroteGlobals = false;
  let cache: CacheComponentsResult | null = null;
  if (hasNext && appDir) {
    const blogDir = join(cwd, appDir, baseSegment);
    const voxxDir = join(blogDir, "_voxx");
    const hasTokens = await detectTokens(cwd);
    wroteGlobals = !hasTokens;
    const globalsImport = hasTokens ? "" : 'import "./_voxx/voxx-globals.css";';

    const isolated =
      preset === "docs" &&
      !add &&
      createdAppDir !== null &&
      baseSegment !== "" &&
      (await isolateCreatedApp(cwd, appDir));
    if (isolated) {
      results.push([
        `${join(appDir, "(site)")}/ (app layout moved — docs has its own root layout)`,
        "written",
      ]);
    }
    const dataFromAppRoot = baseSegment
      ? `./${baseSegment}/_voxx/data`
      : "./_voxx/data";
    const dataFromRouteDir = baseSegment
      ? `../${baseSegment}/_voxx/data`
      : "../_voxx/data";

    results.push([
      relative(cwd, join(voxxDir, "voxx.css")),
      await copyAsset("theme/voxx.css", join(voxxDir, "voxx.css"), force),
    ]);
    if (wroteGlobals) {
      results.push([
        relative(cwd, join(voxxDir, "voxx-globals.css")),
        await copyAsset(
          "theme/demo-globals.css",
          join(voxxDir, "voxx-globals.css"),
          force,
        ),
      ]);
    }

    const templated: Array<
      [
        tpl: string,
        target: string,
        vars?: Record<string, string>,
        siteWide?: boolean,
      ]
    > = [
      [
        preset === "docs"
          ? isolated
            ? "docs/layout-root.tsx.tpl"
            : "docs/layout.tsx.tpl"
          : `${preset}/layout.tsx.tpl`,
        join(blogDir, "layout.tsx"),
        {
          GLOBALS_IMPORT:
            isolated && hasTokens ? 'import "../globals.css";' : globalsImport,
          BASE_PATH: basePath,
          RSS_PATH: basePath === "/" ? "/rss.xml" : `${basePath}/rss.xml`,
        },
      ],
      [
        "shared/data.ts.tpl",
        join(voxxDir, "data.ts"),
        { COLLECTION_ARG: `{ collection: ${JSON.stringify(collectionName)} }` },
      ],
      ["shared/content-version.ts.tpl", join(voxxDir, "content-version.ts")],
      [
        "shared/instrumentation.ts.tpl",
        join(dirname(join(cwd, appDir)), "instrumentation.ts"),
        undefined,
        true,
      ],
    ];

    if (preset !== "changelog") {
      templated.push(
        ["shared/on-this-page.tsx.tpl", join(voxxDir, "on-this-page.tsx")],
        ["shared/metadata.ts.tpl", join(voxxDir, "metadata.ts")],
        [
          "shared/sitemap.ts.tpl",
          join(cwd, appDir, "sitemap.ts"),
          { DATA_IMPORT: dataFromAppRoot },
          true,
        ],
        [
          "shared/robots.ts.tpl",
          join(cwd, appDir, "robots.ts"),
          { DATA_IMPORT: dataFromAppRoot },
          true,
        ],
      );
    }
    templated.push(
      [
        "shared/llms-route.ts.tpl",
        join(cwd, appDir, "llms.txt", "route.ts"),
        { DATA_IMPORT: dataFromRouteDir },
        true,
      ],
      [
        "shared/llms-full-route.ts.tpl",
        join(cwd, appDir, "llms-full.txt", "route.ts"),
        { DATA_IMPORT: dataFromRouteDir },
        true,
      ],
    );
    if (preset !== "docs") {
      templated.push([
        "shared/rss-route.ts.tpl",
        join(blogDir, "rss.xml", "route.ts"),
        { DATA_IMPORT: "../_voxx/data" },
      ]);
    }

    if (preset === "docs") {
      templated.push(
        ["docs/page.tsx.tpl", join(blogDir, "[[...slug]]", "page.tsx")],
        ["docs/doc-page.tsx.tpl", join(voxxDir, "doc-page.tsx")],
        ["docs/sidebar-nav.tsx.tpl", join(voxxDir, "sidebar-nav.tsx")],
        ["docs/mobile-nav.tsx.tpl", join(voxxDir, "mobile-nav.tsx")],
        ["shared/theme-toggle.tsx.tpl", join(voxxDir, "theme-toggle.tsx")],
      );
    } else if (preset === "changelog") {
      templated.push(
        ["changelog/page.tsx.tpl", join(blogDir, "page.tsx")],
        ["changelog/release-list.tsx.tpl", join(voxxDir, "release-list.tsx")],
        ["shared/theme-toggle.tsx.tpl", join(voxxDir, "theme-toggle.tsx")],
      );
    } else {
      templated.push(
        ["blog/page.tsx.tpl", join(blogDir, "page.tsx")],
        ["blog/slug-page.tsx.tpl", join(blogDir, "[slug]", "page.tsx")],
        ["blog/post-page.tsx.tpl", join(voxxDir, "post-page.tsx")],
        ["blog/post-list.tsx.tpl", join(voxxDir, "post-list.tsx")],
        ["shared/theme-toggle.tsx.tpl", join(voxxDir, "theme-toggle.tsx")],
      );
    }

    for (const [tpl, target, vars, siteWide] of templated) {
      const content = render(await readTemplate(tpl), vars ?? {});
      results.push([
        relative(cwd, target),
        await writeFileSafe(target, content, force),
        siteWide,
      ]);
    }

    cache = await enableCacheComponents(cwd, pkg);
    if (cache.kind === "enabled" || cache.kind === "created") {
      results.push([`${cache.file} (cacheComponents: true)`, "written"]);
    }
  }

  log.info("");
  log.info(c.bold(add ? "voxx init --add" : "voxx init"));
  for (const [label, status, siteWide] of results) {
    const mark = status === "written" ? c.green("+") : c.dim("•");
    const note =
      status === "skipped"
        ? add && siteWide
          ? c.dim(" (site-wide, already present)")
          : c.dim(" (exists, skipped)")
        : "";
    const prefix = createdAppDir ? `${relative(process.cwd(), cwd)}/` : "";
    log.info(`  ${mark} ${prefix}${label}${note}`);
  }

  log.info("");
  log.info(c.bold("Next steps:"));
  if (add) {
    log.info(
      `  1. Write content in ${c.cyan(`${contentDir}/`)} (try ${c.cyan(`voxx new "Title" --collection ${collectionName}`)}).`,
    );
    if (hasNext && appDir) {
      log.info(`  2. Run your dev server and open ${c.cyan(basePath)}.`);
    } else if (hasNext) {
      log.warn(
        "Next.js found but no app/ directory — pass --app <dir> to scaffold routes.",
      );
    } else {
      log.info(
        `  2. Run ${c.cyan("voxx build")} to render static HTML to ${c.cyan("./dist")}.`,
      );
    }
    log.info(
      `  ${c.dim('(Feature defaults like rss/toc follow the first collection\'s type — review "features" in voxx.json.)')}`,
    );
    log.info("");
    return;
  }
  if (staticChoice) {
    const writeHint =
      preset === "docs"
        ? `Write pages in ${c.cyan(`${contentDir}/`)} — folders become sections.`
        : preset === "changelog"
          ? `Add releases in ${c.cyan(`${contentDir}/`)} (try ${c.cyan('voxx new "0.2.0"')}).`
          : `Write posts in ${c.cyan(`${contentDir}/`)} (try ${c.cyan('voxx new "My post"')}).`;
    log.info(`  1. ${writeHint}`);
    log.info(`  2. Set ${c.cyan("site.url")} in ${c.cyan("voxx.json")}.`);
    log.info(
      `  3. Run ${c.cyan("voxx build")} to render static HTML to ${c.cyan("./dist")}.`,
    );
  } else if (!hasNext) {
    log.warn("No Next.js detected — wrote voxx.json + sample content only.");
    log.info(`  Install the engine:  ${c.cyan("npm i @prudentbird/voxx-core")}`);
    log.info(`  Or build static HTML: ${c.cyan("npx voxx build")}`);
  } else if (!appDir) {
    log.warn(
      "Next.js found but no app/ directory — pass --app <dir> to scaffold routes.",
    );
  } else {
    let step = 1;
    if (createdAppDir) {
      log.info(
        `  ${step++}. ${c.cyan(`cd ${relative(process.cwd(), createdAppDir)}`)}`,
      );
    }
    log.info(`  ${step++}. Install the engine:  ${c.cyan("npm i @prudentbird/voxx-core")}`);
    if (cache?.kind === "manual") {
      log.info(
        `  ${step++}. Enable Cache Components — add ${c.cyan("cacheComponents: true")} to next.config.`,
      );
    } else if (cache?.kind === "unsupported") {
      log.info(
        `  ${step++}. Upgrade to Next 16+ and add ${c.cyan("cacheComponents: true")} to next.config.`,
      );
    }
    log.info(
      `  ${step++}. Set ${c.cyan("site.url")} in ${c.cyan("voxx.json")}.`,
    );
    log.info(`  ${step}. Run your dev server and open ${c.cyan(basePath)}.`);
    if (cache?.kind === "already") {
      log.info(
        `  ${c.dim(`(Cache Components already enabled in ${cache.file}.)`)}`,
      );
    }
    if (wroteGlobals) {
      log.info(
        `  ${c.dim("(No design tokens found — added voxx-globals.css so it looks good out of the box.)")}`,
      );
    }
    if (preset === "docs" && !createdAppDir && appDir) {
      log.info(
        `  ${c.dim(`(Heads up: your root layout wraps ${basePath} — its navbar/footer will show there too. To isolate the docs, see https://voxx.prudentbird.com/docs/reference/layouts.)`)}`,
      );
    }
  }
  log.info("");
}
