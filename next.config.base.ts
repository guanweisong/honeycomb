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
    formats: ["image/webp"],
    deviceSizes: [640, 960, 1920], // fill 模式生成这几种宽度
    imageSizes: [640, 960, 1920], // 用于有 width 的 Image
    minimumCacheTTL: 31536000,
  },
  poweredByHeader: false,
  env: {
    LINK_OBJECT_ID: "5349b4ddd2781d08c09890f3",
    FRONT_DOMAIN: "www.guanweisong.com",
  },
};

export default baseNextConfig;
