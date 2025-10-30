const commonMark = require("commonmark");

/**
 * 从 Markdown 内容中提取所有图片链接。
 * 使用 `commonmark` 库解析 Markdown 文本，并遍历抽象语法树 (AST) 查找图片节点。
 * @param {string | null | undefined} text - Markdown 格式的文本内容。
 * @returns {string[]} 提取到的所有图片链接的数组，去除了重复项。
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
