import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  transpilePackages: ["@did-it-land/analysis"],
};

export default nextConfig;
