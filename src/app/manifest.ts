import type { MetadataRoute } from "next";

/**
 * 生成 Web App Manifest 文件。
 * 用于定义渐进式 Web 应用 (PWA) 的元数据，如应用名称、图标、启动 URL 等。
 * 保持为静态元数据，避免 Next.js 构建阶段依赖数据库等运行时服务。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Honeycomb",
    short_name: "Honeycomb",
    description: "Honeycomb content management system",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    icons: [
      {
        src: "/static/images/logo.192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/static/images/logo.384.png",
        sizes: "384x384",
        type: "image/png",
      },
      {
        src: "/static/images/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/static/images/desktop.png",
        sizes: "2560x1440",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "/static/images/mobile.png",
        sizes: "780x1688",
        type: "image/png",
      },
    ],
  };
}
