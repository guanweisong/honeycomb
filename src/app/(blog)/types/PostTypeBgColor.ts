import { PostType } from "@/packages/trpc/api/modules/post/types/post.type";

/**
 * 文章类型对应的背景颜色映射。
 * 用于根据文章类型显示不同的颜色。
 */
export const PostTypeBgColor = Object.freeze({
  [PostType.ARTICLE]: "bg-green-600",
  [PostType.MOVIE]: "bg-orange-600",
  [PostType.PHOTOGRAPH]: "bg-purple-600",
  [PostType.QUOTE]: "bg-blue-600",
} as const);
