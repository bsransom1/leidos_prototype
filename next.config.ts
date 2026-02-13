import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle worker files and canvas in server-side rendering
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
      // Ignore worker files during server-side bundling
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  // Use webpack instead of turbopack to avoid worker bundling issues
  turbopack: {},
};

export default nextConfig;
