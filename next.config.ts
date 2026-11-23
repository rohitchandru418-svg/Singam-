import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite"],
  // The app is reached through the workspace's public work host, so the dev server
  // must accept requests for its own assets from that origin.
  allowedDevOrigins: [
    "work-1-qnxakxxailpqmibo.prod-runtime.all-hands.dev",
    "work-2-qnxakxxailpqmibo.prod-runtime.all-hands.dev",
  ],
  eslint: {
    // Linting and type-checking run as explicit scripts, not during the build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
