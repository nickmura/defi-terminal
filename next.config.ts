import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: false,
  },
  // Disable telemetry
  telemetry: false,
};

export default nextConfig;
