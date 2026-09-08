import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  env: {
    // Fallback API URL for production builds — overridden by NEXT_PUBLIC_API_URL env var if set
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      "https://stockpulse-api-2bt6.onrender.com/api",
  },
};

export default nextConfig;
