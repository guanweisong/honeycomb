import { NextConfig } from "next";
import baseNextConfig from "../../next.config.base";

/**
 * Next.js 配置文件。
 * 扩展了基础配置，并可以添加服务端特有的配置。
 */
const nextConfig: NextConfig = {};

export default { ...baseNextConfig, ...nextConfig };
