import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon", permanent: false }];
  },
  reactCompiler: true,
  cacheComponents: true,
  serverExternalPackages: ["@prudentbird/voxx-core"],
};

export default nextConfig;
