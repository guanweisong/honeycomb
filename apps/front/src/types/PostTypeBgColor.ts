import { PostType } from "@honeycomb/types/post/post.type";

/**
 * 文章类型对应的背景颜色映射。
 * 用于根据文章类型显示不同的颜色。
 */
export const PostTypeBgColor = Object.freeze({
  [PostType.ARTICLE]: "bg-green-500",
  [PostType.MOVIE]: "bg-orange-500",
  [PostType.PHOTOGRAPH]: "bg-purple-500",
  [PostType.QUOTE]: "bg-blue-500",
} as const);
