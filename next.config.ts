import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      // All local images without a query string (default site imagery).
      { pathname: "/**", search: "" },
      // Versioned cache-bust for the replaced therapist photo
      // (bump the search value together with the src's ?v=).
      {
        pathname: "/New images/Therapist.jpeg",
        search: "?v=2",
      },
    ],
  },
};

export default nextConfig;
