import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";
import { NextConfig } from "next";
import baseNextConfig from "../../next.config.base";

/**
 * 初始化 `next-intl` 插件。
 * 用于处理国际化相关的 Next.js 配置。
 */
const withNextIntl = createNextIntlPlugin();
/**
 * 初始化 `next-bundle-analyzer` 插件。
 * 用于分析 Next.js 应用的打包文件大小，仅在 `ANALYZE` 环境变量为 "true" 时启用。
 */
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/**
 * Next.js 配置文件。
 * 扩展了基础配置，并可以添加前端应用特有的配置。
 */
const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
};

/**
 * 导出合并后的 Next.js 配置。
 * 将基础配置 (`baseNextConfig`) 与当前应用的特定配置 (`nextConfig`) 合并，
 * 并应用 `next-intl` 和 `next-bundle-analyzer` 插件。
 */
export default withBundleAnalyzer(
  withNextIntl({ ...baseNextConfig, ...nextConfig }),
);
