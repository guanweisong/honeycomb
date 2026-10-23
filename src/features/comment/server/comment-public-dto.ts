import { createHash } from "node:crypto";
import { CommentStatus } from "@/features/comment/types/comment.status";
import type {
  CommentRecord,
  PublicCommentNode,
} from "@/features/comment/types/comment.read-model";

export type PublicCommentSource = Pick<
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

/** 将评论转换为不暴露邮箱和请求元数据的公共数据。 */
export function toPublicComment(
  comment: PublicCommentSource,
): PublicCommentNode {
  // Cravatar 的兼容标识要求 MD5；此摘要不用于密码或安全校验。
  const avatarHash = createHash("md5")
    .update(comment.email.trim().toLowerCase(), "utf8")
    .digest("hex");
  return {
    id: comment.id,
    author: comment.author,
    content: comment.status === CommentStatus.BAN ? "" : comment.content,
    site: comment.site,
    parentId: comment.parentId,
    status: comment.status,
    createdAt: comment.createdAt,
    avatar: `https://cravatar.cn/avatar/${avatarHash}?s=48&d=identicon`,
  };
}

export function buildPublicCommentTree(
  comments: PublicCommentNode[],
): PublicCommentNode[] {
  const nodes = new Map<string, PublicCommentNode>(
    comments.map((comment): [string, PublicCommentNode] => [
      comment.id,
      { ...comment, children: [] },
    ]),
  );
  const roots: PublicCommentNode[] = [];
  for (const comment of comments) {
    const node = nodes.get(comment.id)!;
    const parent = comment.parentId ? nodes.get(comment.parentId) : undefined;
    if (!comment.parentId) roots.push(node);
    else if (parent) (parent.children ??= []).push(node);
  }
  return roots;
}
