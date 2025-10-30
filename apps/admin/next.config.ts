import { NextConfig } from "next";
import baseNextConfig from "../../next.config.base";

/**
 * Next.js 配置文件。
 * 扩展了基础配置，并可以添加管理端特有的配置。
 */
const nextConfig: NextConfig = {
  ...baseNextConfig,
  // 在这里添加或覆盖 admin 应用特有的配置
};

/**
 * 导出合并后的 Next.js 配置。
 */
export default nextConfig;
