import { COMMENT_STATUS, CommentStatus as CommentStatusType } from "@honeycomb/db";

export const CommentStatus = Object.freeze({
  TO_AUDIT: COMMENT_STATUS[0],
  PUBLISH: COMMENT_STATUS[1],
  RUBBISH: COMMENT_STATUS[2],
  BAN: COMMENT_STATUS[3],
} as const);
export type CommentStatus = CommentStatusType;

export const CommentStatusName = Object.freeze({
  TO_AUDIT: "待审核",
  PUBLISH: "已发布",
  RUBBISH: "垃圾评论",
  BAN: "已屏蔽",
} as const);

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
