import { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSerwist } from "@serwist/turbopack";
import {
  createAssetRemotePattern,
  createSecurityHeaderOptions,
  createSecurityHeaders,
} from "./src/packages/infrastructure/security/security-headers";

const securityHeaderOptions = createSecurityHeaderOptions(process.env);
const assetRemotePattern = createAssetRemotePattern(
  securityHeaderOptions.assetUrl,
);
const securityHeaders = createSecurityHeaders(securityHeaderOptions);

export const imageConfig = {
  remotePatterns: [
    {
      protocol: "https" as const,
      hostname: "cravatar.cn",
      port: "",
    },
    ...(assetRemotePattern ? [assetRemotePattern] : []),
  ],
  formats: ["image/avif", "image/webp"] as const,
  deviceSizes: [640, 750, 828, 960, 1080, 1280, 1536, 1920],
  imageSizes: [20, 32, 48, 64, 96, 128, 256, 384],
  minimumCacheTTL: 31536000,
} satisfies NonNullable<NextConfig["images"]>;

/**
 * Next.js 基础配置文件。
 * 包含了所有 Next.js 应用通用的配置，例如 ESLint、TypeScript、图片优化和环境变量等。
 */
const nextConfig: NextConfig = withSerwist({
  reactStrictMode: true,
  experimental: {
    // Reuse visited dynamic route segments in the in-memory client router cache.
    // Auth exits use a hard navigation so private payloads do not cross sessions.
    staleTimes: {
      dynamic: 300,
    },
  },
  images: imageConfig,
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
