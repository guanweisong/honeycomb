import { NextConfig } from "next";
import baseNextConfig from "../../next.config.base";

/**
 * Next.js 配置文件。
 * 扩展了基础配置，并可以添加管理端特有的配置。
 */
const nextConfig: NextConfig = {};

/**
 * 导出合并后的 Next.js 配置。
 * 将基础配置 (`baseNextConfig`) 与当前应用的特定配置 (`nextConfig`) 合并。
 */
export default { ...baseNextConfig, ...nextConfig };
