import type {
  CommentListItem,
  CommentPreviewListItem,
  PublicCommentNode,
} from "../types";

/** 管理端评论展示模型。 */
export type AdminCommentViewModel = CommentListItem | CommentPreviewListItem;
/** 不包含邮箱、IP 和管理关联的公开评论。 */
export type PublicCommentViewModel = Omit<PublicCommentNode, "children">;
/** 公开评论树节点展示模型。 */
export type CommentTreeViewModel = PublicCommentNode;
export interface CommentTreeViewResponse {
  list: CommentTreeViewModel[];
  total: number;
}
