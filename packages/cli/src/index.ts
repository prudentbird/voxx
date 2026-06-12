#!/usr/bin/env node
import { c, log } from "./util";
import { init } from "./commands/init";
import { build } from "./commands/build";
import { dev } from "./commands/dev";
import { newPost } from "./commands/new";

const HELP = `${c.bold("voxx")} — a zero-friction, file-based CMS for blogs and docs

${c.bold("Usage:")}
  voxx init [blog|docs|changelog] [--dir <content>] [--base <path>] [--app <dir>] [--force]
  voxx new "Title" [--slug <slug>] [--dir <content>] [--date <YYYY-MM-DD>] [--flat] [--section <path>] [--order <n>]
  voxx build [--out <dir>] [--drafts]
  voxx dev [--port <n>] [--drafts]

${c.bold("Examples:")}
  voxx init                 Scaffold a blog into your Next.js app
  voxx init docs            Scaffold a docs site instead
  voxx init changelog       Scaffold a release-notes page
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
