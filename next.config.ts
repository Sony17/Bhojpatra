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
      // Customer-uploaded review photos live in the public Vercel Blob store.
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
  // Routes that exist only to forward legacy/parent links to their real home.
  // Handled at the routing layer (checked before the filesystem) so no page
  // component renders just to throw `redirect()`. `permanent: false` keeps the
  // 307 status that `redirect()` was already issuing.
  async redirects() {
    return [
      // `/admin` has no page of its own — send visitors to the dashboard.
      { source: "/admin", destination: "/admin/dashboard", permanent: false },
      // Booking Management was merged into "Customers & Bookings".
      {
        source: "/admin/bookings",
        destination: "/admin/customers?tab=bookings",
        permanent: false,
      },
      // Reports were merged into the dashboard's analytics section.
      {
        source: "/admin/reports",
        destination: "/admin/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
