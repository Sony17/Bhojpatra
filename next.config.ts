import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so Next.js doesn't pick up a
  // parent lockfile higher up the filesystem.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Allow optimized loading of remote food photography from Unsplash.
  // `search` is omitted so Unsplash's sizing query strings (?w=…&q=…) pass.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
