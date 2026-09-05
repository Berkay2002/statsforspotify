import type { NextConfig } from "next";

// Release preflight: report names only, never credential values.
if (process.env.VERCEL_ENV === "production") {
  const required = ["SUPABASE_SERVICE_ROLE_KEY", "SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "NEXT_PUBLIC_APP_URL"];
  const missing = required.filter(name => !process.env[name]?.trim());
  console.info("Maintenance release environment check:", JSON.stringify({ ready: missing.length === 0, missing }));
}

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
