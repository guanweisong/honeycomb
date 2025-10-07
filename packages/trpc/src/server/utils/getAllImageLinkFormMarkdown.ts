const commonMark = require("commonmark");

/**
 * 从markdown内容中提取图片链接
 * @param text
 */
export const getAllImageLinkFormMarkdown = (text?: string | null) => {
  if (!text) {
    return [];
  }
  const reader = new commonMark.Parser();
  const parsed = reader.parse(text ?? "");
  let walker = parsed.walker();
  let event;
  let imageList = [];
  let nodeList = [];
  while ((event = walker.next())) {
    let node = event.node;
    if (node.type === "image" && node.destination) {
      nodeList.push(node);
    }
  }
  imageList = nodeList.map((node) => node.destination);
  return Array.from(new Set(imageList));
};
