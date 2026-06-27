import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-e5ee6e1b-d432-4d32-8e60-fbb1bf112f99.space-z.ai",
  ],
};

export default nextConfig;
