import type { NextConfig } from "next";
import { withVoxx } from "@prudentbird/voxx-core/next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default withVoxx(nextConfig);
