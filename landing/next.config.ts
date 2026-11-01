import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export: the `out/` folder can be hosted on any static host.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: false,
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
