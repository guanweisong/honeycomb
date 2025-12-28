/**
 * 文章的状态
 */

export enum PostStatus {
  "PUBLISHED" = "PUBLISHED",
  "DRAFT" = "DRAFT",
  "TO_AUDIT" = "TO_AUDIT",
}

/** 文章状态对应的中文名称。 */
export enum PostStatusName {
  "PUBLISHED" = "已发布",
  "DRAFT" = "草稿",
  "TO_AUDIT" = "待审核",
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
