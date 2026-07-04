import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectCacheComponents } from "../src/project";
import { init } from "../src/commands/init";
import { exists } from "../src/util";

const originalCwd = process.cwd();
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "voxx-cc-"));
  process.chdir(dir);
  process.exitCode = 0;
});

afterEach(() => {
  process.chdir(originalCwd);
  process.exitCode = 0;
});

async function writeNextConfig(body: string) {
  await writeFile(join(dir, "next.config.ts"), body);
}

describe("detectCacheComponents", () => {
  it("returns true for a config that enables the flag", async () => {
    await writeNextConfig(
      "const nextConfig = { cacheComponents: true };\nexport default nextConfig;\n",
    );
    expect(await detectCacheComponents(dir)).toBe(true);
  });

  it("tolerates quotes and extra whitespace", async () => {
    await writeNextConfig(
      'const nextConfig = {\n  "cacheComponents"  :   true,\n};\nexport default nextConfig;\n',
    );
    expect(await detectCacheComponents(dir)).toBe(true);
  });

  it("returns false when the flag only appears in comments", async () => {
    await writeNextConfig(
      "const nextConfig = {\n  // cacheComponents: true,\n  /* cacheComponents: true */\n};\nexport default nextConfig;\n",
    );
    expect(await detectCacheComponents(dir)).toBe(false);
  });

  it("returns false when the flag is disabled", async () => {
    await writeNextConfig(
      "const nextConfig = { cacheComponents: false };\nexport default nextConfig;\n",
    );
    expect(await detectCacheComponents(dir)).toBe(false);
  });

  it("returns false when the flag is absent", async () => {
    await writeNextConfig("export default {};\n");
    expect(await detectCacheComponents(dir)).toBe(false);
  });

  it("returns false when no config file exists", async () => {
    expect(await detectCacheComponents(dir)).toBe(false);
  });
});

async function seedNextApp() {
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ name: "my-app", dependencies: { next: "16.0.0" } }),
  );
  await mkdir(join(dir, "app"), { recursive: true });
}

const blogDir = () => join(dir, "app", "(voxx)", "blog");

describe("voxx init selects the data variant", () => {
  it("defaults to the static variant with no config flag", async () => {
    await seedNextApp();
    await init(["blog", "--yes"]);

    const data = await readFile(join(blogDir(), "_data.ts"), "utf8");
    expect(data).not.toContain('from "next/cache"');
    expect(data).toContain("process.env.NODE_ENV");
    expect(await exists(join(blogDir(), "_content-version.ts"))).toBe(false);

    const rss = await readFile(
      join(blogDir(), "rss.xml", "route.ts"),
      "utf8",
    );
    expect(rss).toContain('export const dynamic = "force-static";');
  });

  it("selects the cached variant when the config enables the flag", async () => {
    await seedNextApp();
    await writeNextConfig(
      "const nextConfig = { cacheComponents: true };\nexport default nextConfig;\n",
    );
    await init(["blog", "--yes"]);

    const data = await readFile(join(blogDir(), "_data.ts"), "utf8");
    expect(data).toContain('from "next/cache"');
    expect(await exists(join(blogDir(), "_content-version.ts"))).toBe(true);

    const rss = await readFile(
      join(blogDir(), "rss.xml", "route.ts"),
      "utf8",
    );
    expect(rss).not.toContain("force-static");
  });

  it("lets --cache-components override an unflagged config", async () => {
    await seedNextApp();
    await writeNextConfig("export default {};\n");
    await init(["blog", "--yes", "--cache-components"]);

    const data = await readFile(join(blogDir(), "_data.ts"), "utf8");
    expect(data).toContain('"use cache"');
    expect(await exists(join(blogDir(), "_content-version.ts"))).toBe(true);
  });

  it("lets --no-cache-components override a flagged config", async () => {
    await seedNextApp();
    await writeNextConfig(
      "const nextConfig = { cacheComponents: true };\nexport default nextConfig;\n",
    );
    await init(["blog", "--yes", "--no-cache-components"]);

    const data = await readFile(join(blogDir(), "_data.ts"), "utf8");
    expect(data).not.toContain('from "next/cache"');
    expect(await exists(join(blogDir(), "_content-version.ts"))).toBe(false);
  });
});
