/**
 * 页面状态
 */

export enum PageStatus {
  "PUBLISHED" = "PUBLISHED",
  "DRAFT" = "DRAFT",
  "TO_AUDIT" = "TO_AUDIT",
}

/** 页面状态对应的中文名称。 */
export enum PageStatusName {
  "PUBLISHED" = "已发布",
  "DRAFT" = "草稿",
  "TO_AUDIT" = "待审核",
}

/** 用于在 UI 中显示文章状态的选项数组。 */
export const pageStatusOptions = [
  {
    label: PageStatusName.PUBLISHED,
    value: PageStatus.PUBLISHED,
  },
  {
    label: PageStatusName.DRAFT,
    value: PageStatus.DRAFT,
  },
  {
    label: PageStatusName.TO_AUDIT,
    value: PageStatus.TO_AUDIT,
  },
];
