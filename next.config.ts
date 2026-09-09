import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/farmacia-la-salud",
        destination: "/farmamuni",
        permanent: true,
      },
      {
        source: "/farmacia-la-salud/:path*",
        destination: "/farmamuni/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
