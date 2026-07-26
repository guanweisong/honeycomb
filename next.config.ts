import { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSerwist } from "@serwist/turbopack";
import {
  createAssetRemotePattern,
  createSecurityHeaderOptions,
  createSecurityHeaders,
} from "./src/packages/security/security-headers";

const securityHeaderOptions = createSecurityHeaderOptions(process.env);
const assetRemotePattern = createAssetRemotePattern(
  securityHeaderOptions.assetUrl,
);
const securityHeaders = createSecurityHeaders(securityHeaderOptions);

/**
 * Next.js 基础配置文件。
 * 包含了所有 Next.js 应用通用的配置，例如 ESLint、TypeScript、图片优化和环境变量等。
 */
const nextConfig: NextConfig = withSerwist({
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https" as const,
        hostname: "cravatar.cn",
        port: "",
      },
      ...(assetRemotePattern ? [assetRemotePattern] : []),
    ],
    formats: ["image/webp"],
    deviceSizes: [960, 1280, 1920], // fill 模式生成这几种宽度
    imageSizes: [960, 1280, 1920], // 用于有 width 的 Image
    minimumCacheTTL: 31536000,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
});

const withNextIntl = createNextIntlPlugin("./src/app/(blog)/i18n/request.ts");

/**
 * 导出基础 Next.js 配置。
 */
export default withNextIntl(nextConfig);
