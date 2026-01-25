import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Activer le mode standalone pour Docker
  output: 'standalone',

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
