import {
  getTelemetryState,
  setTelemetryEnabled,
} from "@prudentbird/voxx-core/telemetry";
import { log } from "../util";

async function printStatus(): Promise<void> {
  const state = await getTelemetryState();
  if (!state.hasKey) {
    log.info("Telemetry is not configured in this build.");
    return;
  }
  log.info(
    state.enabled
      ? "Telemetry is enabled — anonymous usage data is sent to help improve Voxx."
      : "Telemetry is disabled — no usage data is sent.",
  );
  if (state.envOverride) {
    log.info(
      `It is currently forced off by the ${state.envOverride} environment variable.`,
    );
  }
}

/**
 * Implements `voxx telemetry [status|enable|disable]`, managing the anonymous
 * usage-telemetry opt-out persisted by the shared core engine.
 *
 * @param argv - Arguments after `telemetry` (the subcommand, if any).
 */
export async function telemetry(argv: string[]): Promise<void> {
  const sub = argv[0];
  switch (sub) {
    case "enable": {
      await setTelemetryEnabled(true);
      log.success("Telemetry enabled.");
      const state = await getTelemetryState();
      if (state.envOverride) {
        log.warn(
          `Still off: the ${state.envOverride} environment variable overrides this setting.`,
        );
      }
      break;
    }
    case "disable":
      await setTelemetryEnabled(false);
      log.success("Telemetry disabled. No usage data will be sent.");
      break;
    case undefined:
    case "status":
      await printStatus();
      break;
    default:
      log.error(`Unknown telemetry command: ${sub}`);
      log.info("Usage: voxx telemetry [status|enable|disable]");
      process.exitCode = 1;
  }
}
