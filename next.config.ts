import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ws", 'pino', 'pino-pretty', 'thread-stream'],
};

export default nextConfig;
