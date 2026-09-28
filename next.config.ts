import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      // All local images without a query string (default site imagery).
      { pathname: "/**", search: "" },
    ],
  },
};

export default nextConfig;
