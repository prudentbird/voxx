import type { NextConfig } from "next";
import { withVoxx } from "@prudentbird/voxx-core/next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon", permanent: false }];
  },
  reactCompiler: true,
};

export default withVoxx(nextConfig);
