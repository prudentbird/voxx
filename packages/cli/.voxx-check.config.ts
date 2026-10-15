import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({
  resolve: { alias: [
    { find: /^@prudentbird\/voxx-core$/, replacement: resolve("../core/src/index.ts") },
    { find: /^@prudentbird\/voxx-core\/telemetry$/, replacement: resolve("../core/src/telemetry.ts") },
  ] },
  test: { testTimeout: 120000, hookTimeout: 120000 },
});
