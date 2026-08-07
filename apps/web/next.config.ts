import path from "node:path";

import type { NextConfig } from "next";

/**
 * npm workspaces hoist `node_modules` to the repository root, so both Turbopack
 * and the standalone file tracer have to be told where the workspace actually
 * starts. Without this, `next build` cannot resolve the `next` package itself.
 */
const repoRoot = path.join(process.cwd(), "..", "..");

const nextConfig: NextConfig = {
  // Ships only what the server needs — used by the Docker runtime stage.
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
  images: {
    // design.md 9.6 — cheap phones over congested connections.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
