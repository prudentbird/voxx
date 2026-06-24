#!/usr/bin/env node
import { c, log } from "./util";
import { init } from "./commands/init";
import { add } from "./commands/add";
import { remove } from "./commands/remove";
import { build } from "./commands/build";
import { dev } from "./commands/dev";
import { newPost } from "./commands/new";

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

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "init":
      await init(rest);
      break;
    case "add":
      await add(rest);
      break;
    case "remove":
      await remove(rest);
      break;
    case "new":
      await newPost(rest);
      break;
    case "build":
      await build(rest);
      break;
    case "dev":
      await dev(rest);
      break;
    case undefined:
    case "-h":
    case "--help":
      log.info(HELP);
      break;
    default:
      log.error(`Unknown command: ${cmd}`);
      log.info(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
