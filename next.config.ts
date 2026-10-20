import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Directory content rarely changes; keep the CDN copy for a day between tag invalidations.
  cacheLife: {
    days: {
      stale: 300,
      revalidate: 86_400,
      expire: 604_800,
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    // Cover cards render at most ~360 CSS px wide; fewer widths means fewer billable transformations.
    deviceSizes: [640, 828, 1200],
    imageSizes: [384],
    // mshots serves a "generating" placeholder for new sites, so do not pin images for too long.
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s0.wp.com",
        pathname: "/mshots/v1/**",
        search: "?w=800&h=500",
      },
    ],
  },
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
