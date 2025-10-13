/**
 * 文章类型对应的背景颜色映射。
 * 用于根据文章类型显示不同的颜色。
 */
export const PostTypeBgColor = Object.freeze({
  ARTICLE: "bg-green-500",
  MOVIE: "bg-orange-500",
  PHOTOGRAPH: "bg-purple-500",
  QUOTE: "bg-blue-500",
} as const);
