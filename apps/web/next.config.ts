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

  // Makes `Route` a union of the app's real routes rather than a `string` alias.
  // The public nav is a table of hrefs in one file; without this, a route that is
  // renamed or removed fails at click time on a phone rather than at `tsc`.
  typedRoutes: true,

  // The floating dev badge sits bottom-left, over the page, in every screenshot
  // taken of the running stack — including the ones used to review the design.
  // Compile and runtime errors are still surfaced without it.
  devIndicators: false,

  async redirects() {
    return [
      {
        source: "/evacuation-centers",
        destination: "/barangay-facilities",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
