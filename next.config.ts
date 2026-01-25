import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimisations d'images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;
