import type { CommentListItem, PublicCommentNode } from "../application/repository";

/** 管理端评论展示模型。 */
export type CommentViewModel = CommentListItem;
/** 公开评论树节点展示模型。 */
export type CommentTreeViewModel = PublicCommentNode;
export interface CommentTreeViewResponse {
  list: CommentTreeViewModel[];
  total: number;
}
