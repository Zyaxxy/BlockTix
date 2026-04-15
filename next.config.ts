import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ws", 'pino', 'pino-pretty', 'thread-stream'],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "motion",
      "@dynamic-labs/sdk-react-core",
      "@dynamic-labs/solana",
      "@dynamic-labs/sdk-api-core",
    ],
  },
};

export default nextConfig;
