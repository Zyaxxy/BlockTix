import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ws", 'pino', 'pino-pretty', 'thread-stream'],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "motion"],
  },
};

export default nextConfig;
