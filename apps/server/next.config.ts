import { NextConfig } from "next";
import baseNextConfig from "../../next.config.base";

/**
 * Next.js 配置文件。
 * 扩展了基础配置，并可以添加服务端特有的配置。
 */
const nextConfig: NextConfig = {
  ...baseNextConfig,
  // 在这里添加或覆盖 server 应用特有的配置
  async headers() {
    return [
      {
        // 匹配所有 API 路由
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // 在生产环境中建议替换为具体的域名
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-auth-token, x-secret-key" },
        ],
      },
    ];
  },
};

export default nextConfig;
