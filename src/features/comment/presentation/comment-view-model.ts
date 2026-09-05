import type {
  CommentListItem,
  PublicCommentNode,
} from "../application/repository";

/** 管理端评论展示模型。 */
export type AdminCommentViewModel = CommentListItem;
/** 不包含邮箱、IP 和管理关联的公开评论。 */
export type PublicCommentViewModel = Omit<PublicCommentNode, "children">;
/** 公开评论树节点展示模型。 */
export type CommentTreeViewModel = PublicCommentNode;
export interface CommentTreeViewResponse {
  list: CommentTreeViewModel[];
  total: number;
}
