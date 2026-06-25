/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 */
import "./src/env";
import type { NextConfig } from "next";
import { withVoxx } from "@prudentbird/voxx-core/next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  productionBrowserSourceMaps: true,
  env: {
    NEXT_PUBLIC_DEPLOY_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
  },
};

export default withVoxx(nextConfig);
