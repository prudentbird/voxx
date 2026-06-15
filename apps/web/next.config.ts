import type { NextConfig } from "next";
import { withVoxx } from "@prudentbird/voxx-core/next";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default withVoxx(nextConfig);
