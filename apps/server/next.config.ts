import { NextConfig } from "next";
import baseNextConfig from "../../next.config.base";

/**
 * Next.js 配置文件。
 * 扩展了基础配置，并可以添加服务端特有的配置。
 */
const nextConfig: NextConfig = {
  ...baseNextConfig,
  // 在这里添加或覆盖 server 应用特有的配置
};

export default nextConfig;
