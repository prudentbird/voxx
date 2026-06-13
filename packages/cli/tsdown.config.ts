import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  sourcemap: true,
  deps: { neverBundle: [/^effect/, /^@effect\//, "@prudentbird/voxx-core"] },
});
