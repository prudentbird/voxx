import type { Instrumentation } from "next";
import { onRequestError as postHogOnRequestError } from "@posthog/next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { registerContentWatcher } = await import("@prudentbird/voxx-core");
  await registerContentWatcher();
}

export const onRequestError: Instrumentation.onRequestError = (...args) => {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  return postHogOnRequestError(...args);
};
