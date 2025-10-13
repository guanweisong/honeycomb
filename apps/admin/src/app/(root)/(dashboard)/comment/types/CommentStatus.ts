import { COMMENT_STATUS, CommentStatus as CommentStatusType } from "@honeycomb/db";

/**
 * 评论状态枚举。
 * 定义了评论可能存在的几种状态，例如待审核、已发布等。
 */
export const CommentStatus = Object.freeze({
  TO_AUDIT: COMMENT_STATUS[0],
  PUBLISH: COMMENT_STATUS[1],
  RUBBISH: COMMENT_STATUS[2],
  BAN: COMMENT_STATUS[3],
} as const);
export type CommentStatus = CommentStatusType;

/**
 * 评论状态对应的中文名称映射。
 * 提供了评论状态的国际化显示。
 */
export const CommentStatusName = Object.freeze({
  TO_AUDIT: "待审核",
  PUBLISH: "已发布",
  RUBBISH: "垃圾评论",
  BAN: "已屏蔽",
} as const);

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
