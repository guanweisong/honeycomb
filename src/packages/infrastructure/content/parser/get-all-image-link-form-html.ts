import { DomUtils, parseDocument } from "htmlparser2";

/**
 * 从 HTML 字符串中获取所有图片链接
 * @param html HTML 字符串
 * @returns 图片 URL 数组
 */
/** 从富文本 HTML 中提取图片链接，供内容缓存和媒体关联使用。 */
export function getAllImageLinkFormHtml(html?: string): string[] {
  if (!html) return [];

  const document = parseDocument(html);
  return DomUtils.findAll(
    (element) => element.type === "tag" && element.name === "img",
    document.children,
  ).flatMap((image) => (image.attribs.src ? [image.attribs.src] : []));
}
