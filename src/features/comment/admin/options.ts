import { CommentStatusName } from "../types/comment.status-name";
import { CommentStatus } from "@/features/comment/types/comment.status";

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
