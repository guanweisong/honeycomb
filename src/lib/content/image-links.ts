import { DomUtils, parseDocument } from "htmlparser2";
import { supportedLanguages, type I18n } from "@/lib/i18n/i18n";

/** 按支持语言顺序收集去重图片，避免非中文正文丢失媒体关联。 */
export function getLocalizedImageLinks(
  content?: Partial<I18n> | null,
): string[] {
  return [
    ...new Set(
      supportedLanguages.flatMap((language) =>
        getAllImageLinkFromHtml(content?.[language]),
      ),
    ),
  ];
}

/**
 * 从 HTML 字符串中获取所有图片链接
 * @param html HTML 字符串
 * @returns 图片 URL 数组
 */
/** 从富文本 HTML 中提取图片链接，供内容缓存和媒体关联使用。 */
export function getAllImageLinkFromHtml(html?: string): string[] {
  if (!html) return [];

  const document = parseDocument(html);
  return DomUtils.findAll(
    (element) => element.type === "tag" && element.name === "img",
    document.children,
  ).flatMap((image) => (image.attribs.src ? [image.attribs.src] : []));
}
