import type { NextConfig } from "next";
import { withVoxx } from "@voxx/core/next";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default withVoxx(nextConfig);
