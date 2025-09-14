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

export const postTypeOptions = [
  {
    label: PostTypeName.ARTICLE,
    value: PostType.ARTICLE,
  },
  {
    label: PostTypeName.MOVIE,
    value: PostType.MOVIE,
  },
  {
    label: PostTypeName.PHOTOGRAPH,
    value: PostType.PHOTOGRAPH,
  },
  {
    label: PostTypeName.QUOTE,
    value: PostType.QUOTE,
  },
];
