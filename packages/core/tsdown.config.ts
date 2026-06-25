import { readFileSync } from "node:fs";
import { defineConfig } from "tsdown";

const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  entry: ["src/index.ts", "src/effect.ts", "src/next.ts", "src/telemetry.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  unbundle: true,
  define: {
    "process.env.VOXX_PUBLIC_POSTHOG_KEY": JSON.stringify(
      process.env.VOXX_PUBLIC_POSTHOG_KEY ?? "",
    ),
    "process.env.VOXX_CORE_VERSION": JSON.stringify(version),
  },
  deps: {
    neverBundle: [/^effect/, /^@effect\//],
  },
});
