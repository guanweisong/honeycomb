export enum CommentStatus {
  "TO_AUDIT" = "TO_AUDIT", // 待审核
  "PUBLISH" = "PUBLISH", // 已发布
  "RUBBISH" = "RUBBISH", // 垃圾评论
  "BAN" = "BAN", // 已封禁
}

/**
 * 评论状态对应的中文名称映射。
 * 提供了评论状态的国际化显示。
 */
export enum CommentStatusName {
  TO_AUDIT = "待审核",
  PUBLISH = "已发布",
  RUBBISH = "垃圾评论",
  BAN = "已屏蔽",
}

/**
 * 评论状态的选项列表。
 * 用于表单或选择器中显示评论状态的下拉选项。
 */
export const commentStatusOptions = [
  {
    label: CommentStatusName.TO_AUDIT,
    value: CommentStatus.TO_AUDIT,
  },
  {
    label: CommentStatusName.PUBLISH,
    value: CommentStatus.PUBLISH,
  },
  {
    label: CommentStatusName.RUBBISH,
    value: CommentStatus.RUBBISH,
  },
  {
    label: CommentStatusName.BAN,
    value: CommentStatus.BAN,
  },
];
