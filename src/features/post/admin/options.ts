import { PostStatus } from "@/features/post/post-status";
import { PostType } from "@/features/post/post-type";

/** 文章状态对应的中文名称。 */
export enum PostStatusName {
  PUBLISHED = "已发布",
  DRAFT = "草稿",
  TO_AUDIT = "待审核",
}

/** 用于在 UI 中显示文章状态的选项数组。 */
export const postStatusOptions = [
  {
    label: PostStatusName.PUBLISHED,
    value: PostStatus.PUBLISHED,
  },
  {
    label: PostStatusName.DRAFT,
    value: PostStatus.DRAFT,
  },
  {
    label: PostStatusName.TO_AUDIT,
    value: PostStatus.TO_AUDIT,
  },
];

export enum PostTypeName {
  ARTICLE = "文章",
  MOVIE = "电影",
  PHOTOGRAPH = "画廊",
  QUOTE = "引用",
}

/** 用于在 UI 中显示文章类型的选项数组。 */
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
