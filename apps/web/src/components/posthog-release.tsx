"use client";

import { useEffect } from "react";
import { usePostHog } from "@posthog/next";

const deploySha = process.env.NEXT_PUBLIC_DEPLOY_SHA;

/**
 * Registers the deployed commit SHA as a PostHog super property so every
 * event (including captured exceptions) is tagged with the version that
 * produced it. This has to happen in a client component via `register` —
 * `@posthog/next`'s `PostHogProvider` is a Server Component and cannot accept
 * a `before_send` function through `clientOptions`. Renders nothing.
 */
export function PostHogRelease() {
  const posthog = usePostHog();

  useEffect(() => {
    if (deploySha) {
      posthog.register({ deploy_sha: deploySha });
    }
  }, [posthog]);

  return null;
}
