import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
        pathname: "/image/**",
      },
    ],
    // Cache optimized images for 30 days (Spotify images rarely change)
    // Album art is immutable, artist images change infrequently
    minimumCacheTTL: 2592000, // 30 days in seconds
  },
};

export default nextConfig;
