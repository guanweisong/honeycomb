import { MetadataRoute } from "next";

/**
 * 生成 robots.txt 文件。
 * 用于告诉搜索引擎爬虫哪些页面可以抓取，哪些不可以。
 * @returns {MetadataRoute.Robots} robots.txt 配置对象。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: "https://www.guanweisong.com/sitemap.xml",
  };
}
