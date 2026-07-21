import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The repo root (one level up) also has a lockfile, since this site lives
  // in a `website/` subdirectory of the main PlayOverlay repo. Pin the
  // workspace root explicitly so Next.js/Turbopack doesn't have to guess.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
