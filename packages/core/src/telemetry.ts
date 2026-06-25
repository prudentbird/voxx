import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { arch, homedir, platform } from "node:os";
import { join } from "node:path";
import { PostHog } from "posthog-node";

const POSTHOG_HOST = "https://us.i.posthog.com";
const PROJECT_KEY = process.env.VOXX_PUBLIC_POSTHOG_KEY ?? "";
const CORE_VERSION = process.env.VOXX_CORE_VERSION ?? "";

/** Environment variable that, when truthy, forces telemetry off. */
type EnvOverride = "DO_NOT_TRACK" | "VOXX_TELEMETRY_DISABLED" | "CI";

/** Persisted, machine-local telemetry state. */
interface TelemetryState {
  /** Stable anonymous identifier, generated once per machine. */
  distinctId: string;
  /** Whether the user has opted out via `voxx telemetry disable`. */
  enabled: boolean;
  /** Whether the CLI has already printed its one-time opt-out notice. */
  noticeShown: boolean;
}

/** Resolved telemetry status, accounting for env overrides and the embedded key. */
export interface TelemetryStatus {
  /** Effective state: telemetry only fires when this is `true`. */
  enabled: boolean;
  /** The env var disabling telemetry, or `null` when none is active. */
  envOverride: EnvOverride | null;
  /** The anonymous distinct id reported with events. */
  distinctId: string;
  /** Whether a PostHog project key was baked into this build. */
  hasKey: boolean;
}

/** Context describing which surface emitted an event. */
export interface CaptureContext {
  /** The originating package. */
  source: "core" | "cli";
  /** The version of the originating package. */
  version: string;
}

function truthy(value: string | undefined): boolean {
  return (
    value !== undefined &&
    value !== "" &&
    value !== "0" &&
    value.toLowerCase() !== "false"
  );
}

function envOverride(): EnvOverride | null {
  if (truthy(process.env.DO_NOT_TRACK)) return "DO_NOT_TRACK";
  if (truthy(process.env.VOXX_TELEMETRY_DISABLED))
    return "VOXX_TELEMETRY_DISABLED";
  if (truthy(process.env.CI)) return "CI";
  return null;
}

function stateDir(): string {
  const base =
    process.env.XDG_STATE_HOME?.trim() || join(homedir(), ".local", "state");
  return join(base, "voxx");
}

function stateFile(): string {
  return join(stateDir(), "telemetry.json");
}

async function writeState(state: TelemetryState): Promise<void> {
  try {
    await mkdir(stateDir(), { recursive: true });
    await writeFile(stateFile(), `${JSON.stringify(state, null, 2)}\n`);
  } catch {
    return;
  }
}

async function readPersistedState(): Promise<TelemetryState | null> {
  try {
    const raw = await readFile(stateFile(), "utf8");
    const parsed = JSON.parse(raw) as Partial<TelemetryState>;
    if (typeof parsed.distinctId === "string" && parsed.distinctId) {
      return {
        distinctId: parsed.distinctId,
        enabled: parsed.enabled !== false,
        noticeShown: parsed.noticeShown === true,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Loads the persisted telemetry state, creating and persisting a fresh anonymous
 * identity the first time it runs. Never throws; an unwritable state directory
 * falls back to an in-memory identity for the current process.
 */
async function loadState(): Promise<TelemetryState> {
  const existing = await readPersistedState();
  if (existing) return existing;
  const created: TelemetryState = {
    distinctId: randomUUID(),
    enabled: true,
    noticeShown: false,
  };
  await writeState(created);
  return created;
}

let client: PostHog | null = null;
let clientInitialized = false;

function getClient(): PostHog | null {
  if (clientInitialized) return client;
  clientInitialized = true;
  if (!PROJECT_KEY) return client;
  client = new PostHog(PROJECT_KEY, {
    host: POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

/**
 * Sends a single telemetry event. Anonymous and non-blocking: it attaches only
 * the caller's props plus the source, version, node version, and OS, and
 * swallows every error so telemetry can never disrupt the host process. A no-op
 * when no key is embedded, an env override is active, or the user has opted out.
 *
 * @param event - Event name, e.g. `"command"` or `"core_used"`.
 * @param props - Caller-supplied properties (never argv, paths, names, or content).
 * @param ctx - The originating surface and its version.
 */
export async function capture(
  event: string,
  props: Record<string, unknown>,
  ctx: CaptureContext,
): Promise<void> {
  try {
    if (!PROJECT_KEY || envOverride()) return;
    const state = await loadState();
    if (!state.enabled) return;
    const ph = getClient();
    if (!ph) return;
    ph.capture({
      distinctId: state.distinctId,
      event,
      properties: {
        ...props,
        source: ctx.source,
        version: ctx.version,
        node_version: process.version,
        os_platform: platform(),
        os_arch: arch(),
      },
    });
  } catch {
    return;
  }
}

/**
 * Flushes and closes the PostHog client, raced against a ~1s timeout so a slow
 * or offline network never delays process exit. All errors are swallowed.
 */
export async function shutdownTelemetry(): Promise<void> {
  if (!client) return;
  try {
    await Promise.race([
      Promise.resolve(client.shutdown(1000)),
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 1100);
        timer.unref();
      }),
    ]);
  } catch {
    return;
  }
}

let coreUsageRecorded = false;

/**
 * Records a single anonymous `core_used` event for the current process, at most
 * once regardless of how many engine entry points are called. Fire-and-forget:
 * it never awaits in the hot path and never throws, and it registers a
 * `beforeExit` flush on first use.
 */
export function recordCoreUsage(): void {
  if (coreUsageRecorded) return;
  coreUsageRecorded = true;
  process.once("beforeExit", () => {
    void shutdownTelemetry();
  });
  void capture("core_used", {}, { source: "core", version: CORE_VERSION });
}

/**
 * Resolves the effective telemetry status, combining the persisted opt-out flag,
 * any active env override, and whether a project key was embedded at build time.
 */
export async function getTelemetryState(): Promise<TelemetryStatus> {
  const override = envOverride();
  const state = await loadState();
  return {
    enabled: state.enabled && override === null,
    envOverride: override,
    distinctId: state.distinctId,
    hasKey: PROJECT_KEY.length > 0,
  };
}

/**
 * Persists the opt-out flag. Env overrides still take precedence at capture time,
 * so enabling here does not re-enable telemetry while an override is active.
 *
 * @param enabled - `true` to opt in, `false` to opt out.
 */
export async function setTelemetryEnabled(enabled: boolean): Promise<void> {
  const state = await loadState();
  await writeState({ ...state, enabled });
}

/**
 * Returns `true` when the CLI's one-time opt-out notice has not yet been shown.
 * Never throws.
 */
export async function shouldShowNotice(): Promise<boolean> {
  try {
    const state = await loadState();
    return !state.noticeShown;
  } catch {
    return false;
  }
}

/** Marks the one-time opt-out notice as shown. Never throws. */
export async function markNoticeShown(): Promise<void> {
  try {
    const state = await loadState();
    if (state.noticeShown) return;
    await writeState({ ...state, noticeShown: true });
  } catch {
    return;
  }
}
