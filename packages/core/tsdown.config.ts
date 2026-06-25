import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/effect.ts", "src/next.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  unbundle: true,
  deps: {
    neverBundle: [/^effect/, /^@effect\//],
  },
});
