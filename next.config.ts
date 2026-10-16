import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["pg"],
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/pg/**/*",
      "./node_modules/pg-pool/**/*",
      "./node_modules/pg-connection-string/**/*",
      "./node_modules/pg-protocol/**/*",
      "./node_modules/pg-types/**/*",
      "./node_modules/pgpass/**/*",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**", "**/data/**"],
    };
    return config;
  },
};

export default nextConfig;
