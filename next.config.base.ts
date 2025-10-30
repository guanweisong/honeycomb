import { NextConfig } from "next";

/**
 * Next.js 基础配置文件。
 * 包含了所有 Next.js 应用通用的配置，例如 ESLint、TypeScript、图片优化和环境变量等。
 */
const baseNextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@honeycomb/db",
    "@honeycomb/env",
    "@honeycomb/trpc",
    "@honeycomb/types",
    "@honeycomb/ui",
    "@honeycomb/validation",
  ],
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
    dangerouslyAllowLocalIP: true,
  },
  poweredByHeader: false,
  env: {
    LINK_OBJECT_ID: "5349b4ddd2781d08c09890f3",
    FRONT_DOMAIN: "www.guanweisong.com",
  },
};

/**
 * 导出基础 Next.js 配置。
 */
export default baseNextConfig;
