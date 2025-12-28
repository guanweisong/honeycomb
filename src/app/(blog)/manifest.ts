import { MetadataRoute } from "next";
import { createServerClient } from "@/packages/trpc/server";
/**
 * 生成 Web App Manifest 文件。
 * 用于定义渐进式 Web 应用 (PWA) 的元数据，如应用名称、图标、启动 URL 等。
 * @returns {Promise<MetadataRoute.Manifest>} Web App Manifest 对象。
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const serverClient = await createServerClient();
  const setting = await serverClient.setting.index();
  return {
    name: setting?.siteName?.zh,
    short_name: setting?.siteName?.zh,
    description: setting?.siteSubName?.zh,
    background_color: "#FFFFFF",
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
  };
}
