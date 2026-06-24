import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { init } from "../src/commands/init";
import { add } from "../src/commands/add";
import { typecheckDir } from "./helpers/typecheck";

const originalCwd = process.cwd();
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "voxx-cli-"));
  process.chdir(dir);
  process.exitCode = 0;
});

afterEach(() => {
  process.chdir(originalCwd);
  process.exitCode = 0;
});

describe("voxx init scaffold output typechecks", () => {
  for (const preset of ["blog", "docs", "changelog"] as const) {
    it(`scaffolded ${preset} routes typecheck`, async () => {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ name: "my-app", dependencies: { next: "16.0.0" } }),
      );
      await mkdir(join(dir, "app"), { recursive: true });
      await init([preset]);
      const diagnostics = await typecheckDir(join(dir, "app"));
      expect(diagnostics).toEqual([]);
    });
  }

  it("a multi-collection app typechecks", async () => {
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "my-app", dependencies: { next: "16.0.0" } }),
    );
    await mkdir(join(dir, "app"), { recursive: true });
    await init(["blog", "docs", "changelog", "--yes"]);
    expect(process.exitCode).not.toBe(1);
    const diagnostics = await typecheckDir(join(dir, "app"));
    expect(diagnostics).toEqual([]);
  });

  it("an app augmented via `add collection` typechecks", async () => {
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "my-app", dependencies: { next: "16.0.0" } }),
    );
    await mkdir(join(dir, "app"), { recursive: true });
    await init(["blog"]);
    await add(["collection", "docs"]);
    await add(["collection", "changelog"]);
    expect(process.exitCode).not.toBe(1);
    const diagnostics = await typecheckDir(join(dir, "app"));
    expect(diagnostics).toEqual([]);
  });

  it("a feature removed then re-added typechecks", async () => {
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "my-app", dependencies: { next: "16.0.0" } }),
    );
    await mkdir(join(dir, "app"), { recursive: true });
    await init(["blog", "--no-sitemap", "--no-llms", "--yes"]);
    await add(["sitemap"]);
    await add(["llms"]);
    expect(process.exitCode).not.toBe(1);
    const diagnostics = await typecheckDir(join(dir, "app"));
    expect(diagnostics).toEqual([]);
  });
});
