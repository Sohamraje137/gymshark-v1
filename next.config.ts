import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Dockerfile sets BUILD_STANDALONE=1 to get a self-contained server in .next/standalone.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  experimental: {
    serverActions: { bodySizeLimit: "6mb" }, // Cronometer CSV uploads (capped at 5 MB in the action)
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  async headers() {
    return [
      {
        // The service worker must never be served stale, or app updates get stuck.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
