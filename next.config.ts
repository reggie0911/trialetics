import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/protected/investigational-product',
        destination: '/protected/inventory-management',
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
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [{ protocol: "https" as const, hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname }]
        : [{ protocol: "https" as const, hostname: "wbeqxqzwtgspkotlpgzw.supabase.co" }]),
    ],
  },
  // Suppress hydration warnings caused by browser extensions and dev tools
  reactStrictMode: true,
  // Increase body size limits for large CSV uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
    proxyClientMaxBodySize: '500mb', // For API routes with FormData
  },
};

export default nextConfig;
