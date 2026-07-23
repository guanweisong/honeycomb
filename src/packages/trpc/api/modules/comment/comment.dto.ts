import md5 from "md5";
import type { CommentRecord } from "./types/comment.model";

type PublicCommentSource = Pick<
  CommentRecord,
  | "id"
  | "author"
  | "content"
  | "site"
  | "email"
  | "parentId"
  | "status"
  | "createdAt"
>;

export function toPublicComment(comment: PublicCommentSource) {
  return {
    id: comment.id.toString(),
    author: comment.author,
    content: comment.content,
    site: comment.site,
    parentId: comment.parentId,
    status: comment.status,
    createdAt: comment.createdAt,
    avatar: `https://cravatar.cn/avatar/${md5(
      comment.email.trim().toLowerCase(),
    )}?s=48&d=identicon`,
  };
}
