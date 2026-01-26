import * as cheerio from "cheerio";

/**
 * 从 HTML 字符串中获取所有图片链接
 * @param html HTML 字符串
 * @returns 图片 URL 数组
 */
export function getAllImageLinkFormHtml(html?: string): string[] {
  if (!html) return [];

  const $ = cheerio.load(html);
  const imageLinks: string[] = [];

  $("img").each((_: any, img: any) => {
    const src = $(img).attr("src");
    if (src) {
      imageLinks.push(src);
    }
  });

  return imageLinks;
}
