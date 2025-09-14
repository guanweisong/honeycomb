import { POST_STATUS, PostStatus as PostStatusType } from "@honeycomb/db";

export const PostStatus = Object.freeze({
  PUBLISHED: POST_STATUS[0],
  DRAFT: POST_STATUS[1],
  TO_AUDIT: POST_STATUS[2],
} as const);
export type PostStatus = PostStatusType;

export const PostStatusName = Object.freeze({
  PUBLISHED: "已发布",
  DRAFT: "草稿",
  TO_AUDIT: "待审核",
} as const);

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
