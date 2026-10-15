import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as telemetry from "@prudentbird/voxx-core/telemetry";

vi.mock("@prudentbird/voxx-core/telemetry", () => ({
  capture: vi.fn(),
  getTelemetryState: vi.fn(),
  markNoticeShown: vi.fn(),
  shouldShowNotice: vi.fn(),
  shutdownTelemetry: vi.fn(),
}));
vi.mock("../src/commands/init", () => ({ init: vi.fn() }));
vi.mock("../src/commands/add", () => ({ add: vi.fn() }));
vi.mock("../src/commands/remove", () => ({ remove: vi.fn() }));
vi.mock("../src/commands/build", () => ({ build: vi.fn() }));
vi.mock("../src/commands/dev", () => ({ dev: vi.fn() }));
vi.mock("../src/commands/new", () => ({ newPost: vi.fn() }));
vi.mock("../src/commands/telemetry", () => ({ telemetry: vi.fn() }));

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };
const { version: coreVersion } = JSON.parse(
  readFileSync(new URL("../../core/package.json", import.meta.url), "utf8"),
) as { version: string };
const originalArgv = process.argv;
const originalExitCode = process.exitCode;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.exitCode = 0;
});

afterEach(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function run(args: string[]) {
  process.argv = [process.execPath, "voxx", ...args];
  await import("../src/index");
  // Wait for main's completion handlers as well as the module evaluation.
  await new Promise((resolve) => setImmediate(resolve));
}

function expectNoTelemetry() {
  for (const fn of Object.values(telemetry)) {
    expect(fn).not.toHaveBeenCalled();
  }
}

describe.each(["--version", "-v", "version"])("voxx %s", (flag) => {
  it.each([undefined, "", "9.8.7"])(
    "prints the version with VOXX_VERSION=%s without telemetry",
    async (injectedVersion) => {
      vi.stubEnv("VOXX_VERSION", injectedVersion);
      await run([flag]);

      expect(process.exitCode).toBe(0);
      expect(console.error).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`voxx ${injectedVersion || version}`),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`@prudentbird/voxx-core ${coreVersion}`),
      );
      expectNoTelemetry();
    },
  );
});

it.each([{ args: [] }, { args: ["-h"] }, { args: ["--help"] }])(
  "keeps help successful: $args",
  async ({ args }) => {
    await run(args);

    expect(process.exitCode).toBe(0);
    expect(console.error).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("--version"),
    );
    expectNoTelemetry();
  },
);

it("still rejects unknown commands", async () => {
  await run(["unknown-command"]);

  expect(process.exitCode).toBe(1);
  expect(console.error).toHaveBeenCalledWith(
    expect.stringContaining("Unknown command: unknown-command"),
  );
  expectNoTelemetry();
});
