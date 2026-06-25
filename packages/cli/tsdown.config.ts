import { readFileSync } from "node:fs";
import { defineConfig } from "tsdown";

const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  sourcemap: true,
  define: {
    "process.env.VOXX_VERSION": JSON.stringify(version),
  },
  deps: { neverBundle: [/^effect/, /^@effect\//, "@prudentbird/voxx-core"] },
});
