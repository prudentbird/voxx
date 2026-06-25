#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import {
  capture,
  getTelemetryState,
  markNoticeShown,
  shouldShowNotice,
  shutdownTelemetry,
} from "@prudentbird/voxx-core/telemetry";
import { c, log } from "./util";
import { init } from "./commands/init";
import { add } from "./commands/add";
import { remove } from "./commands/remove";
import { build } from "./commands/build";
import { dev } from "./commands/dev";
import { newPost } from "./commands/new";
import { telemetry } from "./commands/telemetry";

const TRACKED_COMMANDS: Record<string, (args: string[]) => Promise<void>> = {
  init,
  add,
  remove,
  new: newPost,
  build,
  dev: (args) => dev(args).then(() => {}),
  telemetry,
};

const HELP = `${c.bold("voxx")} — a zero-friction, file-based CMS for blogs and docs

${c.bold("Usage:")}
  voxx init [blog|docs|changelog ...] [--name <name>] [--dir <content>] [--base <path>] [--app <dir>]
                                      [--target <dir>] [--static|--next] [--no-<feature>] [--yes] [--force]
  voxx add collection <blog|docs|changelog> [--name <name>] [--dir <dir>] [--base <path>] [--force]
  voxx add <feature>        Enable a feature (rss, sitemap, robots, llms, toc, tags, reading-time)
  voxx remove <feature>     Disable a feature and delete its generated route files
  voxx new "Title" [--collection <name>] [--slug <slug>] [--dir <content>] [--date <YYYY-MM-DD>] [--flat] [--section <path>] [--order <n>] [--index]
  voxx build [--out <dir>] [--drafts]
  voxx dev [--port <n>] [--drafts]
  voxx telemetry [status|enable|disable]   Manage anonymous usage telemetry

${c.bold("Examples:")}
  voxx init                 Set up Voxx interactively (prompts for type, name, features)
  voxx init blog docs       Scaffold a blog and docs collection together
  voxx init blog --name posts --no-sitemap --yes   Headless: a blog named "posts", no sitemap
  voxx add collection docs  Add a docs collection to an existing site
  voxx add sitemap          Turn the sitemap back on and scaffold its route
  voxx remove llms          Disable llms.txt and delete its routes
  voxx new "Hello world"    Create a new markdown post (or doc page, or release)
  voxx build                Render a static HTML site to ./dist
  voxx dev                  Preview the static site locally, rebuilding on change
`;

/**
 * Prints the one-time, anonymous-telemetry opt-out notice on first tracked run,
 * then records that it has been shown. Best-effort and silent on any failure.
 */
async function showTelemetryNotice(): Promise<void> {
  try {
    const state = await getTelemetryState();
    if (!state.hasKey || !state.enabled) return;
    if (!(await shouldShowNotice())) return;
    log.info(
      c.dim(
        "Voxx collects anonymous usage telemetry (command, duration, success, versions, OS) to improve the tool. No content, paths, names, or arguments are collected. Opt out with `voxx telemetry disable` or DO_NOT_TRACK=1.",
      ),
    );
    await markNoticeShown();
  } catch {
    return;
  }
}

async function dispatch(
  cmd: string | undefined,
  rest: string[],
): Promise<void> {
  const handler =
    cmd !== undefined && Object.hasOwn(TRACKED_COMMANDS, cmd)
      ? TRACKED_COMMANDS[cmd]
      : undefined;
  if (handler) {
    await handler(rest);
  } else if (
    cmd === undefined ||
    cmd === "-h" ||
    cmd === "--help"
  ) {
    log.info(HELP);
  } else {
    log.error(`Unknown command: ${cmd}`);
    log.info(HELP);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const tracked = cmd !== undefined && Object.hasOwn(TRACKED_COMMANDS, cmd);
  if (tracked) await showTelemetryNotice();

  const start = performance.now();
  let threw = false;
  try {
    await dispatch(cmd, rest);
  } catch (err) {
    threw = true;
    throw err;
  } finally {
    if (tracked) {
      const success = !threw && !process.exitCode;
      await capture(
        "command",
        {
          command: cmd,
          success,
          durationMs: Math.round(performance.now() - start),
        },
        { source: "cli", version: process.env.VOXX_VERSION ?? "" },
      );
      await shutdownTelemetry();
    }
  }
}

main().catch((err) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
