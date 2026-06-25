/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 */
import "./src/env";
import type { NextConfig } from "next";
import { withVoxx } from "@prudentbird/voxx-core/next";

const posthogCredentialed = Boolean(
  process.env.POSTHOG_CLI_API_KEY && process.env.POSTHOG_CLI_ENV_ID,
);

const nextConfig: NextConfig = {
  reactCompiler: true,
  productionBrowserSourceMaps: posthogCredentialed,
};

export default withVoxx(nextConfig);
