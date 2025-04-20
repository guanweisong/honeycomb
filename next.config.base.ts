import { NextConfig } from "next";

const baseNextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.guanweisong.com",
        port: "",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 600,
  },
  poweredByHeader: false,
  env: {
    LINK_OBJECT_ID: "5349b4ddd2781d08c09890f3",
    FRONT_DOMAIN: "www.guanweisong.com",
  },
};

export default baseNextConfig;
