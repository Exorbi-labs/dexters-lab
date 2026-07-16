import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // This app is nested inside the Selsa repo; pin the workspace root so
  // neither Turbopack nor output-file tracing infers it from a parent lockfile.
  turbopack: {
    root: path.resolve(__dirname),
  },
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
