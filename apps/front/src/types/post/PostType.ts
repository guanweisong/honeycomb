import { POST_TYPE, PostType as PostTypeType } from "@honeycomb/db";

export const PostType = Object.freeze({
  ARTICLE: POST_TYPE[0],
  MOVIE: POST_TYPE[1],
  PHOTOGRAPH: POST_TYPE[2],
  QUOTE: POST_TYPE[3],
} as const);
export type PostType = PostTypeType;

export const PostTypeName = Object.freeze({
  ARTICLE: "文章",
  MOVIE: "电影",
  PHOTOGRAPH: "画廊",
  QUOTE: "引用",
} as const);

export const PostTypeBgColor = Object.freeze({
  ARTICLE: "bg-green-500",
  MOVIE: "bg-orange-500",
  PHOTOGRAPH: "bg-purple-500",
  QUOTE: "bg-blue-500",
} as const);
