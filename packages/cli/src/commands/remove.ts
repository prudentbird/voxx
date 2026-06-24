import { relative } from "node:path";
import {
  c,
  deleteFiles,
  exists,
  log,
  type WriteOutcome,
} from "../util";
import { FEATURE_KEYS, FEATURES, type FeatureKey } from "../features";
import { featureFilePaths } from "../scaffold";
import { loadProject, writeConfig } from "../project";
import { canPrompt, promptConfirm, PromptCancelled } from "../prompts";

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

function printDeletions(
  title: string,
  configLabel: string,
  deletions: WriteOutcome[],
): void {
  log.info("");
  log.info(c.bold(title));
  log.info(`  ${c.yellow("~")} ${configLabel}`);
  for (const [label, status] of deletions) {
    const mark = status === "skipped" ? c.dim("•") : c.red("-");
    const note =
      status === "skipped" ? c.dim(" (not present)") : c.dim(" (deleted)");
    log.info(`  ${mark} ${label}${note}`);
  }
  log.info("");
}

export async function remove(argv: string[]): Promise<void> {
  const [target, ...rest] = argv;
  const force = rest.includes("--force") || rest.includes("-y") || rest.includes("--yes");

  if (!target) {
    log.error(`Usage: voxx remove <${FEATURE_KEYS.join("|")}>`);
    process.exitCode = 1;
    return;
  }
  const key = FEATURE_ALIASES[target.toLowerCase()];
  if (!key) {
    log.error(
      `Unknown feature "${target}" — expected one of: ${FEATURE_KEYS.join(", ")}.`,
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

  const features = (project.raw["features"] ?? {}) as Record<string, boolean>;
  features[key] = false;
  project.raw["features"] = features;
  await writeConfig(project.cwd, project.raw);

  const configLabel = `voxx.json (features.${key} = false)`;
  const deletions: WriteOutcome[] = [];

  if (FEATURES[key].ownsFiles && project.hasNext && project.appDir) {
    const candidates = featureFilePaths(
      project.cwd,
      project.appDir,
      project.collections,
      key,
    );
    const present: string[] = [];
    for (const path of candidates) {
      if (await exists(path)) present.push(path);
    }

    if (present.length > 0) {
      const interactive = canPrompt();
      let proceed = force || !interactive;
      if (interactive && !force) {
        log.warn(`These files will be deleted:`);
        for (const path of present) {
          log.info(`  ${c.red("-")} ${relative(project.cwd, path)}`);
        }
        try {
          proceed = await promptConfirm({
            message: "Delete them?",
            initialValue: false,
          });
        } catch (err) {
          if (err instanceof PromptCancelled) {
            process.exitCode = 1;
            return;
          }
          throw err;
        }
      }
      if (proceed) {
        deletions.push(...(await deleteFiles(present, project.cwd)));
      } else {
        log.info(
          `  ${c.dim(`(left ${present.length} file(s) in place — delete manually to fully remove ${key}.)`)}`,
        );
      }
    }
  }

  printDeletions(`voxx remove ${key}`, configLabel, deletions);
}
